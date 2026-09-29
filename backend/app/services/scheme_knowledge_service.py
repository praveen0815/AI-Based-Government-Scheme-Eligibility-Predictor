"""Catalog-backed scheme knowledge. Does not invent conditions or score eligibility."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.scheme_knowledge import SchemeKnowledgeItemRecord
from app.schemas.scheme_knowledge import (
    KNOWLEDGE_DISCLAIMER,
    KNOWLEDGE_FIELD_KEYS,
    KNOWLEDGE_FIELD_LABELS,
    KnowledgeContentState,
    KnowledgeFieldKey,
    KnowledgeVerificationStatus,
    SchemeKnowledgeItem,
    SchemeKnowledgeItemUpdate,
    SchemeKnowledgeListResponse,
    SchemeKnowledgeRecord,
)
from app.services.scheme_service import SchemeRecord, get_scheme_service

_NEEDS_VERIFICATION = "needs verification"


class SchemeKnowledgeNotFoundError(Exception):
    """Raised when the scheme or knowledge field is not in the official catalog."""


class SchemeKnowledgeRejectedError(Exception):
    """Raised when a knowledge update is invalid."""


def list_scheme_knowledge(
    session: Session | None,
    *,
    q: str | None = None,
    scheme_id: str | None = None,
    department: str | None = None,
    category: str | None = None,
) -> SchemeKnowledgeListResponse:
    records = get_scheme_service().list_catalog()
    overlays = _load_overlays(session, [record.scheme_id for record in records])
    needle = (q or "").strip().lower()
    wanted_id = (scheme_id or "").strip()
    visible: list[SchemeKnowledgeRecord] = []
    for record in records:
        if wanted_id and record.scheme_id != wanted_id:
            continue
        if department and (record.department or "") != department:
            continue
        if category and (record.scheme_category or "") != category:
            continue
        item = _to_record(record, overlays.get(record.scheme_id, {}))
        if needle and not _matches_query(item, needle):
            continue
        visible.append(item)
    return SchemeKnowledgeListResponse(
        scheme_count=len(visible),
        total_catalog_count=len(records),
        schemes=visible,
        departments=_unique([record.department for record in records]),
        categories=_unique([record.scheme_category for record in records]),
        disclaimer=KNOWLEDGE_DISCLAIMER,
    )


def get_scheme_knowledge(session: Session | None, scheme_id: str) -> SchemeKnowledgeRecord:
    record = get_scheme_service().get_record(scheme_id)
    if record is None:
        raise SchemeKnowledgeNotFoundError("No scheme knowledge record was found.")
    overlays = _load_overlays(session, [record.scheme_id])
    return _to_record(record, overlays.get(record.scheme_id, {}))


def update_scheme_knowledge_item(
    session: Session,
    scheme_id: str,
    field_key: str,
    payload: SchemeKnowledgeItemUpdate,
    admin_user_id: str,
) -> SchemeKnowledgeRecord:
    if field_key not in KNOWLEDGE_FIELD_KEYS:
        raise SchemeKnowledgeRejectedError("That knowledge field is not part of the official catalog overlay.")
    record = get_scheme_service().get_record(scheme_id)
    if record is None:
        raise SchemeKnowledgeNotFoundError("No scheme knowledge record was found.")
    if (
        payload.verification_status is None
        and payload.source_url is None
        and payload.last_verified_at is None
    ):
        raise SchemeKnowledgeRejectedError("Provide a verification status, source URL, or last-verified date.")

    try:
        row = (
            session.query(SchemeKnowledgeItemRecord)
            .filter(
                SchemeKnowledgeItemRecord.scheme_id == scheme_id,
                SchemeKnowledgeItemRecord.field_key == field_key,
            )
            .one_or_none()
        )
        if row is None:
            row = SchemeKnowledgeItemRecord(
                scheme_id=scheme_id,
                field_key=field_key,
                verification_status=_default_status(_field_value(record, field_key)),
            )
            session.add(row)
        if payload.verification_status is not None:
            row.verification_status = payload.verification_status
        if "source_url" in payload.model_fields_set:
            row.source_url = payload.source_url
        if "last_verified_at" in payload.model_fields_set:
            row.last_verified_at = _parse_verified_at(payload.last_verified_at)
        elif payload.verification_status == "verified" and row.last_verified_at is None:
            row.last_verified_at = datetime.now(timezone.utc)
        row.updated_by = admin_user_id
        row.updated_at = datetime.now(timezone.utc)
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The scheme knowledge database is unavailable.") from exc
    return get_scheme_knowledge(session, scheme_id)


def _load_overlays(
    session: Session | None, scheme_ids: list[str]
) -> dict[str, dict[str, SchemeKnowledgeItemRecord]]:
    if session is None or not scheme_ids:
        return {}
    try:
        rows = (
            session.query(SchemeKnowledgeItemRecord)
            .filter(SchemeKnowledgeItemRecord.scheme_id.in_(scheme_ids))
            .all()
        )
    except (OperationalError, InterfaceError):
        return {}
    overlays: dict[str, dict[str, SchemeKnowledgeItemRecord]] = {}
    for row in rows:
        overlays.setdefault(row.scheme_id, {})[row.field_key] = row
    return overlays


def _to_record(
    record: SchemeRecord, overlay: dict[str, SchemeKnowledgeItemRecord]
) -> SchemeKnowledgeRecord:
    items = [_to_item(record, key, overlay.get(key)) for key in KNOWLEDGE_FIELD_KEYS]
    return SchemeKnowledgeRecord(
        scheme_id=record.scheme_id,
        scheme_name=record.scheme_name,
        department=record.department,
        scheme_category=record.scheme_category,
        ml_scope=record.ml_scope,
        catalog_rule_status=record.eligibility_rule_status,
        official_source_url=record.official_source_url,
        items=items,
        disclaimer=KNOWLEDGE_DISCLAIMER,
    )


def _to_item(
    record: SchemeRecord,
    field_key: KnowledgeFieldKey,
    overlay: SchemeKnowledgeItemRecord | None,
) -> SchemeKnowledgeItem:
    value = _field_value(record, field_key)
    content_state = _content_state(value)
    default_status = _default_status(value)
    source_url = record.official_source_url
    last_verified: str | None = None
    status: KnowledgeVerificationStatus = default_status
    if overlay is not None:
        if overlay.verification_status in {"verified", "unverified", "missing"}:
            status = overlay.verification_status  # type: ignore[assignment]
        if overlay.source_url:
            source_url = overlay.source_url
        if overlay.last_verified_at is not None:
            last_verified = overlay.last_verified_at.date().isoformat()
    return SchemeKnowledgeItem(
        field_key=field_key,
        label=KNOWLEDGE_FIELD_LABELS[field_key],
        value=value,
        content_state=content_state,
        verification_status=status,
        source_url=source_url,
        last_verified_at=last_verified,
        catalog_access_date=record.source_access_date,
    )


def _field_value(record: SchemeRecord, field_key: str) -> str | None:
    return getattr(record, field_key, None)


def _content_state(value: str | None) -> KnowledgeContentState:
    if not value:
        return "missing"
    if _NEEDS_VERIFICATION in value.lower():
        return "unverified_placeholder"
    return "present"


def _default_status(value: str | None) -> KnowledgeVerificationStatus:
    if not value:
        return "missing"
    return "unverified"


def _matches_query(record: SchemeKnowledgeRecord, needle: str) -> bool:
    haystacks = [
        record.scheme_id,
        record.scheme_name,
        record.department,
        record.scheme_category,
        record.official_source_url,
    ]
    haystacks.extend(item.value for item in record.items)
    return any(needle in (value or "").lower() for value in haystacks)


def _unique(values: list[str | None]) -> list[str]:
    seen: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.append(value)
    return seen


def _parse_verified_at(value: str | None) -> datetime | None:
    if not value:
        return None
    text = value.strip()
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S%z", "%Y-%m-%dT%H:%M:%S"):
        try:
            parsed = datetime.strptime(text.replace("Z", "+00:00") if fmt.startswith("%Y-%m-%dT") else text, fmt)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            continue
    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError as exc:
        raise SchemeKnowledgeRejectedError("Use an ISO date such as 2026-09-28 for last-verified.") from exc
