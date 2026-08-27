"""Persist and read recommendation history for the authenticated user."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.history import RecommendationHistoryRecord
from app.schemas.history import HistorySchemeRef, RecommendationHistoryItem
from app.schemas.prediction import CitizenProfile
from app.schemas.wallet import CitizenWalletResponse
from app.services.scheme_service import CatalogUnavailableError, get_scheme_service


class HistoryNotFoundError(Exception):
    """Raised when history is missing or is not owned by the caller."""


PROFILE_SNAPSHOT_FIELDS: tuple[str, ...] = (
    "age",
    "gender",
    "is_student",
    "first_higher_education_course",
    "school_background",
    "marital_status",
    "is_orphan",
    "is_destitute",
    "occupation_category",
    "wet_land_acres",
    "dry_land_acres",
)


def wallet_profile_snapshot(wallet: CitizenWalletResponse) -> dict:
    return {field: getattr(wallet, field) for field in PROFILE_SNAPSHOT_FIELDS}


def save_recommendation_history(
    session: Session,
    user_id: str,
    profile_snapshot: dict,
    recommended_scheme_ids: list[str],
) -> RecommendationHistoryRecord:
    record = RecommendationHistoryRecord(
        user_id=user_id,
        checked_at=datetime.now(timezone.utc),
        profile_snapshot=profile_snapshot,
        recommended_scheme_ids=list(recommended_scheme_ids),
        recommendation_count=len(recommended_scheme_ids),
    )
    session.add(record)
    try:
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The recommendation history database is unavailable.") from exc
    session.refresh(record)
    return record


def list_history_for_user(session: Session, user_id: str) -> list[RecommendationHistoryItem]:
    try:
        records = (
            session.query(RecommendationHistoryRecord)
            .filter(RecommendationHistoryRecord.user_id == user_id)
            .order_by(RecommendationHistoryRecord.checked_at.desc())
            .all()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The recommendation history database is unavailable.") from exc
    return [_to_item(record) for record in records]


def get_history_for_user(session: Session, history_id: str, user_id: str) -> RecommendationHistoryItem:
    return _to_item(_owned_record(session, history_id, user_id))


def delete_history_for_user(session: Session, history_id: str, user_id: str) -> None:
    record = _owned_record(session, history_id, user_id)
    session.delete(record)
    try:
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The recommendation history database is unavailable.") from exc


def _owned_record(session: Session, history_id: str, user_id: str) -> RecommendationHistoryRecord:
    try:
        record = (
            session.query(RecommendationHistoryRecord)
            .filter(RecommendationHistoryRecord.id == history_id)
            .one_or_none()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The recommendation history database is unavailable.") from exc
    if record is None or record.user_id != user_id:
        raise HistoryNotFoundError("No recommendation history was found.")
    return record


def _to_item(record: RecommendationHistoryRecord) -> RecommendationHistoryItem:
    scheme_ids = [str(scheme_id) for scheme_id in (record.recommended_scheme_ids or [])]
    return RecommendationHistoryItem(
        id=record.id,
        checked_at=record.checked_at,
        profile_snapshot=CitizenProfile.model_validate(record.profile_snapshot),
        recommended_scheme_ids=scheme_ids,
        recommendation_count=int(record.recommendation_count),
        recommended_schemes=[
            HistorySchemeRef(scheme_id=scheme_id, scheme_name=_scheme_name(scheme_id))
            for scheme_id in scheme_ids
        ],
    )


def _scheme_name(scheme_id: str) -> str:
    try:
        return get_scheme_service().require_core(scheme_id).scheme_name
    except CatalogUnavailableError:
        return scheme_id
