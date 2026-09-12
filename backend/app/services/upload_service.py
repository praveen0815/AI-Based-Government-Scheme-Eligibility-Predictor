"""Owner-only supporting-document uploads. No OCR or identity analysis."""

from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.uploads import SupportingUploadRecord
from app.schemas.uploads import (
    ALLOWED_CONTENT_TYPES,
    UPLOAD_CATEGORIES,
    UPLOAD_DISCLAIMER,
    SupportingUpload,
    SupportingUploadListResponse,
    UploadCategory,
)
from app.services.document_checklist_service import recommended_core_scheme_ids
from app.services.scheme_service import CatalogUnavailableError, get_scheme_service
from app.services.upload_storage import (
    allocate_stored_filename,
    delete_all_user_files,
    delete_user_file,
    save_user_file,
    user_file_path,
)

MAX_UPLOAD_BYTES = 5 * 1024 * 1024
MAX_UPLOADS_PER_USER = 20
_SENSITIVE_NAME = re.compile(
    r"aadhaar|aadhar|uidai|passport|pan[\s._-]?card|\bpan\b|biometric|fingerprint",
    re.IGNORECASE,
)

_SIGNATURES: tuple[tuple[bytes, str, str], ...] = (
    (b"%PDF", "application/pdf", ".pdf"),
    (b"\x89PNG\r\n\x1a\n", "image/png", ".png"),
    (b"\xff\xd8\xff", "image/jpeg", ".jpg"),
)


class UploadNotFoundError(Exception):
    """Raised when the upload is missing or is not owned by the caller."""


class UploadRejectedError(Exception):
    """Raised when the file, category, or name is not allowed."""


def _iso(value: datetime) -> str:
    return value.isoformat()


def _scheme_name(scheme_id: str | None) -> str | None:
    if not scheme_id:
        return None
    try:
        return get_scheme_service().require_core(scheme_id).scheme_name
    except CatalogUnavailableError:
        return scheme_id


def _display_name(original: str | None) -> str:
    raw = (original or "").replace("\\", "/")
    base = Path(raw).name.strip() or "document"
    cleaned = re.sub(r"[^\w.\- ()]+", "_", base).strip(" ._")[:180]
    return cleaned or "document"


def _looks_sensitive(name: str) -> bool:
    return bool(_SENSITIVE_NAME.search(name))


def _detect_type(payload: bytes) -> tuple[str, str]:
    for signature, content_type, extension in _SIGNATURES:
        if payload.startswith(signature):
            return content_type, extension
    raise UploadRejectedError("Only PDF, JPG, JPEG, and PNG files can be uploaded.")


def _normalize_scheme_id(session: Session, user_id: str, scheme_id: str | None) -> str | None:
    value = (scheme_id or "").strip() or None
    if value is None:
        return None
    allowed = recommended_core_scheme_ids(session, user_id)
    if value not in allowed:
        raise UploadNotFoundError("No recommended scheme was found for that upload link.")
    return value


def _to_item(row: SupportingUploadRecord) -> SupportingUpload:
    category: UploadCategory = row.category if row.category in UPLOAD_CATEGORIES else "other_supporting"
    return SupportingUpload(
        id=row.id,
        category=category,
        display_name=row.display_name,
        stored_filename=row.stored_filename,
        content_type=row.content_type,
        size_bytes=row.size_bytes,
        scheme_id=row.scheme_id,
        scheme_name=_scheme_name(row.scheme_id),
        review_status=row.review_status if getattr(row, "review_status", None) in {"pending", "verified", "rejected"} else "pending",
        created_at=_iso(row.created_at),
        disclaimer=UPLOAD_DISCLAIMER,
    )


def _owned_row(session: Session, user_id: str, upload_id: str) -> SupportingUploadRecord:
    try:
        row = (
            session.query(SupportingUploadRecord)
            .filter(SupportingUploadRecord.id == upload_id, SupportingUploadRecord.user_id == user_id)
            .one_or_none()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The supporting-document database is unavailable.") from exc
    if row is None:
        raise UploadNotFoundError("No supporting document was found.")
    return row


def list_uploads(
    session: Session,
    user_id: str,
    scheme_id: str | None = None,
) -> SupportingUploadListResponse:
    try:
        query = session.query(SupportingUploadRecord).filter(SupportingUploadRecord.user_id == user_id)
        if scheme_id:
            query = query.filter(SupportingUploadRecord.scheme_id == scheme_id)
        rows = query.order_by(SupportingUploadRecord.created_at.desc()).all()
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The supporting-document database is unavailable.") from exc
    items = [_to_item(row) for row in rows]
    return SupportingUploadListResponse(uploads=items, count=len(items), disclaimer=UPLOAD_DISCLAIMER)


def get_upload(session: Session, user_id: str, upload_id: str) -> SupportingUpload:
    return _to_item(_owned_row(session, user_id, upload_id))


def get_upload_file(session: Session, user_id: str, upload_id: str) -> tuple[Path, SupportingUpload]:
    row = _owned_row(session, user_id, upload_id)
    path = user_file_path(user_id, row.stored_filename)
    if not path.is_file():
        raise UploadNotFoundError("No supporting document was found.")
    return path, _to_item(row)


def create_upload(
    session: Session,
    user_id: str,
    category: str,
    original_filename: str | None,
    payload: bytes,
    scheme_id: str | None = None,
) -> SupportingUpload:
    if category not in UPLOAD_CATEGORIES:
        raise UploadRejectedError("Choose a permitted supporting-document category.")
    display_name = _display_name(original_filename)
    if _looks_sensitive(display_name) or _looks_sensitive(original_filename or ""):
        raise UploadRejectedError(
            "Do not upload Aadhaar, PAN, passport, or other sensitive identity documents. "
            "This is an academic research prototype."
        )
    if not payload:
        raise UploadRejectedError("The uploaded file is empty.")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise UploadRejectedError("The file is larger than the 5 MB prototype limit.")
    content_type, extension = _detect_type(payload)
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise UploadRejectedError("Only PDF, JPG, JPEG, and PNG files can be uploaded.")

    try:
        existing = (
            session.query(SupportingUploadRecord)
            .filter(SupportingUploadRecord.user_id == user_id)
            .count()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The supporting-document database is unavailable.") from exc
    if existing >= MAX_UPLOADS_PER_USER:
        raise UploadRejectedError("This prototype allows at most 20 supporting documents per account.")

    linked = _normalize_scheme_id(session, user_id, scheme_id)
    stored_filename = allocate_stored_filename(extension)
    save_user_file(user_id, stored_filename, payload)
    row = SupportingUploadRecord(
        user_id=user_id,
        category=category,
        display_name=display_name,
        stored_filename=stored_filename,
        content_type=content_type,
        size_bytes=len(payload),
        scheme_id=linked,
        review_status="pending",
    )
    try:
        session.add(row)
        session.commit()
        session.refresh(row)
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        delete_user_file(user_id, stored_filename)
        raise DatabaseUnavailableError("The supporting-document database is unavailable.") from exc
    return _to_item(row)


def update_upload_link(
    session: Session,
    user_id: str,
    upload_id: str,
    scheme_id: str | None,
) -> SupportingUpload:
    row = _owned_row(session, user_id, upload_id)
    row.scheme_id = _normalize_scheme_id(session, user_id, scheme_id)
    try:
        session.commit()
        session.refresh(row)
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The supporting-document database is unavailable.") from exc
    return _to_item(row)


def delete_upload(session: Session, user_id: str, upload_id: str) -> None:
    row = _owned_row(session, user_id, upload_id)
    stored_filename = row.stored_filename
    try:
        session.delete(row)
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The supporting-document database is unavailable.") from exc
    delete_user_file(user_id, stored_filename)


def delete_uploads_for_user(session: Session, user_id: str) -> None:
    session.query(SupportingUploadRecord).filter(SupportingUploadRecord.user_id == user_id).delete(
        synchronize_session=False
    )
    delete_all_user_files(user_id)
