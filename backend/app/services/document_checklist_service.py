"""Build catalog-backed document checklists. Does not invent official requirements."""

from __future__ import annotations

import re
from datetime import datetime

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.documents import DocumentChecklistProgressRecord
from app.models.history import RecommendationHistoryRecord
from app.paths import ensure_ml_src_on_path
from app.schemas.documents import (
    OFFICIAL_SOURCE_ITEM_KEY,
    OFFICIAL_SOURCE_ITEM_LABEL,
    DocumentChecklistItem,
    DocumentPrepStatus,
    DocumentProgressResponse,
    SchemeDocumentChecklist,
    SchemeDocumentSummary,
)
from app.services.scheme_service import CatalogUnavailableError, get_scheme_service

ensure_ml_src_on_path()

from ml_config import CORE_SCHEME_IDS  # noqa: E402

PREPARATION_DISCLAIMER = (
    "Document preparation progress is a research-prototype checklist. "
    "It is not government approval, official verification, or eligibility."
)

_UNVERIFIED = {"needs verification", "need verification", "n/a", "na", "none"}


class DocumentChecklistNotFoundError(Exception):
    """Raised when the scheme is missing, not CORE, or was never recommended to the caller."""


def _slug(label: str, used: set[str]) -> str:
    base = re.sub(r"[^a-z0-9]+", "-", label.lower()).strip("-")[:72] or "document"
    key = base
    index = 2
    while key in used:
        key = f"{base}-{index}"[:80]
        index += 1
    used.add(key)
    return key


def catalog_document_labels(required_documents: str | None) -> list[str]:
    """Split catalog text into document labels. Does not invent missing lists."""
    if not required_documents:
        return []
    text = required_documents.strip()
    if text.lower() in _UNVERIFIED:
        return []
    labels: list[str] = []
    for raw in re.split(r"[;\n]", text):
        part = raw.strip(" .")
        if not part or part.lower() in _UNVERIFIED:
            continue
        official_note = re.split(r"(?i)\.\s+Official\b", part, maxsplit=1)[0].strip(" .")
        if official_note and official_note.lower() not in _UNVERIFIED:
            labels.append(official_note)
    return labels


def _template_items(required_documents: str | None) -> list[tuple[str, str, str]]:
    used = {OFFICIAL_SOURCE_ITEM_KEY}
    items = [
        (OFFICIAL_SOURCE_ITEM_KEY, OFFICIAL_SOURCE_ITEM_LABEL, "project_reminder"),
    ]
    for label in catalog_document_labels(required_documents):
        items.append((_slug(label, used), label, "catalog"))
    return items


def _progress_percent(ready_count: int, item_count: int) -> int:
    if item_count <= 0:
        return 0
    return round((ready_count / item_count) * 100)


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def recommended_core_scheme_ids(session: Session, user_id: str) -> list[str]:
    try:
        records = (
            session.query(RecommendationHistoryRecord)
            .filter(RecommendationHistoryRecord.user_id == user_id)
            .order_by(RecommendationHistoryRecord.checked_at.desc())
            .all()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The document checklist database is unavailable.") from exc
    seen: list[str] = []
    core = set(CORE_SCHEME_IDS)
    for record in records:
        for scheme_id in record.recommended_scheme_ids or []:
            if scheme_id in core and scheme_id not in seen:
                seen.append(str(scheme_id))
    return seen


def _saved_rows(session: Session, user_id: str, scheme_id: str | None = None) -> list[DocumentChecklistProgressRecord]:
    try:
        query = session.query(DocumentChecklistProgressRecord).filter(
            DocumentChecklistProgressRecord.user_id == user_id
        )
        if scheme_id is not None:
            query = query.filter(DocumentChecklistProgressRecord.scheme_id == scheme_id)
        return query.all()
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The document checklist database is unavailable.") from exc


def _build_scheme_checklist(
    session: Session,
    user_id: str,
    scheme_id: str,
) -> SchemeDocumentChecklist:
    try:
        record = get_scheme_service().require_core(scheme_id)
    except CatalogUnavailableError as exc:
        raise DocumentChecklistNotFoundError("No document checklist was found for that scheme.") from exc
    saved = {row.item_key: row for row in _saved_rows(session, user_id, scheme_id)}
    items: list[DocumentChecklistItem] = []
    ready_count = 0
    has_saved = False
    for item_key, label, source in _template_items(record.required_documents):
        row = saved.get(item_key)
        status: DocumentPrepStatus = "not_started"
        updated_at = None
        if row is not None and row.status in {"not_started", "ready", "needs_verification"}:
            status = row.status  # type: ignore[assignment]
            updated_at = _iso(row.updated_at)
            has_saved = True
        if status == "ready":
            ready_count += 1
        items.append(
            DocumentChecklistItem(
                item_key=item_key,
                label=label,
                source=source,  # type: ignore[arg-type]
                status=status,
                updated_at=updated_at,
            )
        )
    catalog_labels = catalog_document_labels(record.required_documents)
    return SchemeDocumentChecklist(
        scheme_id=record.scheme_id,
        scheme_name=record.scheme_name,
        official_source_url=record.official_source_url,
        documents_need_verification=len(catalog_labels) == 0,
        required_documents_text=record.required_documents,
        ready_count=ready_count,
        item_count=len(items),
        progress_percent=_progress_percent(ready_count, len(items)),
        has_saved_progress=has_saved,
        items=items,
        disclaimer=PREPARATION_DISCLAIMER,
    )


def list_document_progress(session: Session, user_id: str) -> DocumentProgressResponse:
    scheme_ids = recommended_core_scheme_ids(session, user_id)
    summaries: list[SchemeDocumentSummary] = []
    overall_ready = 0
    overall_items = 0
    schemes_with_progress = 0
    for scheme_id in scheme_ids:
        checklist = _build_scheme_checklist(session, user_id, scheme_id)
        overall_ready += checklist.ready_count
        overall_items += checklist.item_count
        if checklist.has_saved_progress:
            schemes_with_progress += 1
        summaries.append(
            SchemeDocumentSummary(
                scheme_id=checklist.scheme_id,
                scheme_name=checklist.scheme_name,
                official_source_url=checklist.official_source_url,
                documents_need_verification=checklist.documents_need_verification,
                ready_count=checklist.ready_count,
                item_count=checklist.item_count,
                progress_percent=checklist.progress_percent,
                has_saved_progress=checklist.has_saved_progress,
            )
        )
    return DocumentProgressResponse(
        schemes=summaries,
        schemes_with_progress=schemes_with_progress,
        overall_ready_count=overall_ready,
        overall_item_count=overall_items,
        overall_progress_percent=_progress_percent(overall_ready, overall_items),
        disclaimer=PREPARATION_DISCLAIMER,
    )


def get_scheme_checklist(session: Session, user_id: str, scheme_id: str) -> SchemeDocumentChecklist:
    allowed = recommended_core_scheme_ids(session, user_id)
    if scheme_id not in allowed:
        raise DocumentChecklistNotFoundError("No document checklist was found for that scheme.")
    return _build_scheme_checklist(session, user_id, scheme_id)


def update_item_status(
    session: Session,
    user_id: str,
    scheme_id: str,
    item_key: str,
    status: DocumentPrepStatus,
) -> SchemeDocumentChecklist:
    checklist = get_scheme_checklist(session, user_id, scheme_id)
    allowed_keys = {item.item_key for item in checklist.items}
    if item_key not in allowed_keys:
        raise DocumentChecklistNotFoundError("No document checklist item was found.")
    try:
        row = (
            session.query(DocumentChecklistProgressRecord)
            .filter(
                DocumentChecklistProgressRecord.user_id == user_id,
                DocumentChecklistProgressRecord.scheme_id == scheme_id,
                DocumentChecklistProgressRecord.item_key == item_key,
            )
            .one_or_none()
        )
        if row is None:
            session.add(
                DocumentChecklistProgressRecord(
                    user_id=user_id,
                    scheme_id=scheme_id,
                    item_key=item_key,
                    status=status,
                )
            )
        else:
            row.status = status
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The document checklist database is unavailable.") from exc
    return get_scheme_checklist(session, user_id, scheme_id)


def delete_progress_for_user(session: Session, user_id: str) -> None:
    session.query(DocumentChecklistProgressRecord).filter(
        DocumentChecklistProgressRecord.user_id == user_id
    ).delete(synchronize_session=False)
