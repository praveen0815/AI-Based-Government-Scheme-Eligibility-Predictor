"""Authenticated AI document scanner routes. OCR is not document verification."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.document_scanner import (
    DocumentScanConfirmRequest,
    DocumentScanCreate,
    DocumentScanResponse,
    SupportedScanTypesResponse,
)
from app.services.document_scanner_service import (
    cancel_scan,
    confirm_scan,
    create_scan,
    get_scan,
    supported_scan_types,
)

router = APIRouter(prefix="/api/v1/document-scans", tags=["document-scanner"])

_NOTE = (
    "Requires a JWT. OCR extraction is untrusted until the citizen reviews and "
    "confirms fields. Scanning does not verify a document or change eligibility."
)


@router.get(
    "/types",
    response_model=SupportedScanTypesResponse,
    summary="List document types the scanner can map onto the existing wallet",
    description=_NOTE,
)
def read_supported_scan_types(
    current_user: UserRecord = Depends(get_current_user),
) -> SupportedScanTypesResponse:
    _ = current_user
    return supported_scan_types()


@router.post(
    "",
    response_model=DocumentScanResponse,
    status_code=201,
    summary="Extract wallet fields from an owned supporting document",
    description=_NOTE,
)
def create_document_scan(
    payload: DocumentScanCreate,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> DocumentScanResponse:
    return create_scan(require_db(session), current_user.id, payload.upload_id, payload.document_type)


@router.get(
    "/{scan_id}",
    response_model=DocumentScanResponse,
    summary="Return one owned document scan",
    description=_NOTE,
)
def read_document_scan(
    scan_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> DocumentScanResponse:
    return get_scan(require_db(session), current_user.id, scan_id)


@router.post(
    "/{scan_id}/confirm",
    response_model=DocumentScanResponse,
    summary="Apply only citizen-confirmed fields to the owned wallet",
    description=_NOTE,
)
def confirm_document_scan(
    scan_id: str,
    payload: DocumentScanConfirmRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> DocumentScanResponse:
    return confirm_scan(require_db(session), current_user.id, scan_id, payload.fields)


@router.post(
    "/{scan_id}/cancel",
    response_model=DocumentScanResponse,
    summary="Discard a pending scan without changing the wallet",
    description=_NOTE,
)
def cancel_document_scan(
    scan_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> DocumentScanResponse:
    return cancel_scan(require_db(session), current_user.id, scan_id)
