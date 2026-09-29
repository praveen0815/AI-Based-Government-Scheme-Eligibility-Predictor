"""Citizen-reviewed OCR drafts. Never changes eligibility or admin review status."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.document_scans import DocumentScanRecord
from app.schemas.document_scanner import (
    EDUCATION_WALLET_FIELDS,
    SCANNER_DISCLAIMER,
    SUPPORTED_SCAN_TYPES,
    DocumentScanResponse,
    ExtractedField,
    ScanDocumentType,
    SupportedScanType,
    SupportedScanTypesResponse,
)
from app.schemas.prediction import CitizenProfile
from app.schemas.wallet import CitizenWalletResponse
from app.services.document_field_parser import coerce_confirmed_education_fields, parse_education_certificate
from app.services.ocr_service import get_ocr_provider
from app.services.upload_service import get_upload, get_upload_file
from app.services.wallet_service import (
    WalletNotFoundError,
    require_wallet_for_user,
    update_wallet,
)

SCAN_STATUSES = frozenset({"pending_review", "confirmed", "cancelled", "failed"})


class DocumentScanNotFoundError(Exception):
    """Raised when the scan is missing or is not owned by the caller."""


class DocumentScanRejectedError(Exception):
    """Raised when the document type, ownership, or confirmation is invalid."""


class DocumentScanConflictError(Exception):
    """Raised when a scan is no longer awaiting citizen review."""


def supported_scan_types() -> SupportedScanTypesResponse:
    return SupportedScanTypesResponse(
        types=[
            SupportedScanType(
                document_type="education_certificate",
                wallet_fields=list(EDUCATION_WALLET_FIELDS),
                note=(
                    "Education certificates can propose age, student status, "
                    "first higher-education course, and school background."
                ),
            )
        ],
        unsupported_notes=[
            "Income certificates are not scanned in this phase because the wallet has no income field.",
            "Community, address, and identity documents are not scanned because they do not map to CORE wallet fields.",
        ],
        disclaimer=SCANNER_DISCLAIMER,
    )


def create_scan(
    session: Session,
    user_id: str,
    upload_id: str,
    document_type: str,
) -> DocumentScanResponse:
    if document_type not in SUPPORTED_SCAN_TYPES:
        raise DocumentScanRejectedError(
            "This document type is not supported for scanning yet. Start with an education certificate."
        )
    upload = get_upload(session, user_id, upload_id)
    if upload.category != document_type:
        raise DocumentScanRejectedError(
            "Scan an education certificate. The selected file is a different document category."
        )
    path, _item = get_upload_file(session, user_id, upload_id)
    payload = path.read_bytes()
    ocr = get_ocr_provider().extract_text(payload, upload.content_type)
    values, clarity = parse_education_certificate(ocr.text, mean_confidence=ocr.mean_confidence)
    row = _persist_scan(
        session,
        user_id=user_id,
        upload_id=upload_id,
        document_type=document_type,
        status="pending_review",
        extracted_fields=values,
        field_clarity=clarity,
        error_code=None,
    )
    return _to_response(row, upload.review_status, _optional_wallet(session, user_id))


def get_scan(session: Session, user_id: str, scan_id: str) -> DocumentScanResponse:
    row = _owned_scan(session, user_id, scan_id)
    upload = get_upload(session, user_id, row.upload_id)
    return _to_response(row, upload.review_status, _optional_wallet(session, user_id))


def confirm_scan(
    session: Session,
    user_id: str,
    scan_id: str,
    fields: dict[str, Any],
) -> DocumentScanResponse:
    row = _owned_scan(session, user_id, scan_id)
    if row.status != "pending_review":
        raise DocumentScanConflictError("This scan is no longer waiting for confirmation.")
    if row.document_type not in SUPPORTED_SCAN_TYPES:
        raise DocumentScanRejectedError("This document type is not supported for scanning yet.")
    try:
        confirmed = coerce_confirmed_education_fields(fields)
    except ValueError as exc:
        raise DocumentScanRejectedError(str(exc)) from exc
    if not confirmed:
        raise DocumentScanRejectedError("Confirm at least one reviewed field before updating the wallet.")

    wallet = require_wallet_for_user(session, user_id)
    merged = _merge_wallet(wallet, confirmed)
    updated = update_wallet(session, wallet.citizen_id, merged, user_id)

    row.status = "confirmed"
    row.confirmed_fields = confirmed
    row.updated_at = datetime.now(timezone.utc)
    _commit(session)
    session.refresh(row)
    upload_after = get_upload(session, user_id, row.upload_id)
    return _to_response(row, upload_after.review_status, updated, applied_fields=list(confirmed))


def cancel_scan(session: Session, user_id: str, scan_id: str) -> DocumentScanResponse:
    row = _owned_scan(session, user_id, scan_id)
    if row.status != "pending_review":
        raise DocumentScanConflictError("This scan is no longer waiting for confirmation.")
    row.status = "cancelled"
    row.updated_at = datetime.now(timezone.utc)
    _commit(session)
    session.refresh(row)
    upload = get_upload(session, user_id, row.upload_id)
    return _to_response(row, upload.review_status, _optional_wallet(session, user_id))


def delete_scans_for_user(session: Session, user_id: str) -> None:
    session.query(DocumentScanRecord).filter(DocumentScanRecord.user_id == user_id).delete(
        synchronize_session=False
    )


def _optional_wallet(session: Session, user_id: str) -> CitizenWalletResponse | None:
    try:
        return require_wallet_for_user(session, user_id)
    except WalletNotFoundError:
        return None


def _merge_wallet(wallet: CitizenWalletResponse, confirmed: dict[str, Any]) -> CitizenProfile:
    return CitizenProfile(
        age=int(confirmed.get("age", wallet.age)),
        gender=wallet.gender,
        is_student=bool(confirmed.get("is_student", wallet.is_student)),
        first_higher_education_course=bool(
            confirmed.get("first_higher_education_course", wallet.first_higher_education_course)
        ),
        school_background=confirmed.get("school_background", wallet.school_background),
        marital_status=wallet.marital_status,
        is_orphan=wallet.is_orphan,
        is_destitute=wallet.is_destitute,
        occupation_category=wallet.occupation_category,
        wet_land_acres=wallet.wet_land_acres,
        dry_land_acres=wallet.dry_land_acres,
    )


def _persist_scan(
    session: Session,
    *,
    user_id: str,
    upload_id: str,
    document_type: str,
    status: str,
    extracted_fields: dict[str, Any],
    field_clarity: dict[str, str],
    error_code: str | None,
) -> DocumentScanRecord:
    row = DocumentScanRecord(
        user_id=user_id,
        upload_id=upload_id,
        document_type=document_type,
        status=status,
        extracted_fields=extracted_fields,
        field_clarity=field_clarity,
        confirmed_fields=None,
        error_code=error_code,
    )
    try:
        session.add(row)
        session.commit()
        session.refresh(row)
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The document scanner database is unavailable.") from exc
    return row


def _owned_scan(session: Session, user_id: str, scan_id: str) -> DocumentScanRecord:
    try:
        row = (
            session.query(DocumentScanRecord)
            .filter(DocumentScanRecord.id == scan_id, DocumentScanRecord.user_id == user_id)
            .one_or_none()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The document scanner database is unavailable.") from exc
    if row is None:
        raise DocumentScanNotFoundError("No document scan was found.")
    return row


def _commit(session: Session) -> None:
    try:
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The document scanner database is unavailable.") from exc


def _current_wallet_value(wallet: CitizenWalletResponse | None, name: str) -> Any | None:
    if wallet is None:
        return None
    return getattr(wallet, name, None)


def _to_response(
    row: DocumentScanRecord,
    review_status: str,
    wallet: CitizenWalletResponse | None,
    applied_fields: list[str] | None = None,
) -> DocumentScanResponse:
    document_type: ScanDocumentType = (
        row.document_type if row.document_type in SUPPORTED_SCAN_TYPES else "education_certificate"
    )
    extracted = row.extracted_fields or {}
    clarity = row.field_clarity or {}
    fields = [
        ExtractedField(
            name=name,
            value=extracted.get(name),
            clarity=clarity.get(name, "missing") if clarity.get(name) in {"extracted", "unclear", "missing"} else "missing",
            current_wallet_value=_current_wallet_value(wallet, name),
        )
        for name in EDUCATION_WALLET_FIELDS
    ]
    return DocumentScanResponse(
        id=row.id,
        upload_id=row.upload_id,
        document_type=document_type,
        status=row.status if row.status in SCAN_STATUSES else "failed",
        review_status=review_status if review_status in {"pending", "verified", "rejected"} else "pending",
        fields=fields,
        applied_fields=applied_fields or [],
        wallet=wallet if row.status == "confirmed" else None,
        disclaimer=SCANNER_DISCLAIMER,
        created_at=row.created_at.isoformat(),
    )
