"""Track application-preparation stages for recommended CORE schemes.

Does not submit applications or change eligibility results.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.readiness import ApplicationReadinessRecord
from app.schemas.readiness import (
    READINESS_DISCLAIMER,
    READINESS_STAGES,
    ReadinessProgressResponse,
    ReadinessStage,
    SchemeReadiness,
)
from app.services.document_checklist_service import recommended_core_scheme_ids
from app.services.scheme_service import CatalogUnavailableError, get_scheme_service


class ReadinessNotFoundError(Exception):
    """Raised when the scheme is missing, not CORE, or was never recommended to the caller."""


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _stage_index(stage: ReadinessStage) -> int:
    return READINESS_STAGES.index(stage)


def _progress_percent(stage: ReadinessStage) -> int:
    last = len(READINESS_STAGES) - 1
    if last <= 0:
        return 0
    return round((_stage_index(stage) / last) * 100)


def _saved_rows(session: Session, user_id: str) -> dict[str, ApplicationReadinessRecord]:
    try:
        rows = (
            session.query(ApplicationReadinessRecord)
            .filter(ApplicationReadinessRecord.user_id == user_id)
            .all()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The application readiness database is unavailable.") from exc
    return {row.scheme_id: row for row in rows}


def _build_scheme(session: Session, user_id: str, scheme_id: str, saved: dict[str, ApplicationReadinessRecord]) -> SchemeReadiness:
    try:
        record = get_scheme_service().require_core(scheme_id)
    except CatalogUnavailableError as exc:
        raise ReadinessNotFoundError("No application readiness tracker was found for that scheme.") from exc
    row = saved.get(scheme_id)
    stage: ReadinessStage = "not_started"
    updated_at = None
    has_saved = False
    if row is not None and row.stage in READINESS_STAGES:
        stage = row.stage  # type: ignore[assignment]
        updated_at = _iso(row.updated_at)
        has_saved = True
    return SchemeReadiness(
        scheme_id=record.scheme_id,
        scheme_name=record.scheme_name,
        official_source_url=record.official_source_url,
        stage=stage,
        stage_index=_stage_index(stage),
        stage_count=len(READINESS_STAGES),
        progress_percent=_progress_percent(stage),
        has_saved_progress=has_saved,
        updated_at=updated_at,
        disclaimer=READINESS_DISCLAIMER,
    )


def list_readiness(session: Session, user_id: str) -> ReadinessProgressResponse:
    scheme_ids = recommended_core_scheme_ids(session, user_id)
    saved = _saved_rows(session, user_id)
    schemes = [_build_scheme(session, user_id, scheme_id, saved) for scheme_id in scheme_ids]
    prepared = [item for item in schemes if item.has_saved_progress and item.stage != "not_started"]
    overall = (
        round(sum(item.progress_percent for item in prepared) / len(prepared)) if prepared else 0
    )
    return ReadinessProgressResponse(
        schemes=schemes,
        schemes_being_prepared=len(prepared),
        overall_progress_percent=overall,
        disclaimer=READINESS_DISCLAIMER,
    )


def get_scheme_readiness(session: Session, user_id: str, scheme_id: str) -> SchemeReadiness:
    allowed = recommended_core_scheme_ids(session, user_id)
    if scheme_id not in allowed:
        raise ReadinessNotFoundError("No application readiness tracker was found for that scheme.")
    return _build_scheme(session, user_id, scheme_id, _saved_rows(session, user_id))


def update_scheme_stage(
    session: Session,
    user_id: str,
    scheme_id: str,
    stage: ReadinessStage,
) -> SchemeReadiness:
    get_scheme_readiness(session, user_id, scheme_id)
    try:
        row = (
            session.query(ApplicationReadinessRecord)
            .filter(
                ApplicationReadinessRecord.user_id == user_id,
                ApplicationReadinessRecord.scheme_id == scheme_id,
            )
            .one_or_none()
        )
        if row is None:
            session.add(ApplicationReadinessRecord(user_id=user_id, scheme_id=scheme_id, stage=stage))
        else:
            row.stage = stage
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The application readiness database is unavailable.") from exc
    return get_scheme_readiness(session, user_id, scheme_id)
