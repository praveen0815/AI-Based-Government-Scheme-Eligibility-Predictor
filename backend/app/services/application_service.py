"""Owner-only application tracking. Does not submit government applications."""

from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy.exc import IntegrityError, InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.applications import ApplicationTrackingRecord
from app.schemas.applications import (
    APPLICATION_DISCLAIMER,
    APPLICATION_STATUSES,
    ApplicationItem,
    ApplicationListResponse,
    ApplicationStatus,
)
from app.services.scheme_service import CatalogUnavailableError, get_scheme_service


class ApplicationNotFoundError(Exception):
    """Raised when the tracked application is missing or not owned by the caller."""


class ApplicationConflictError(Exception):
    """Raised when the caller already tracks this scheme."""


def _iso(value: datetime | None) -> str:
    if value is None:
        return datetime.now(timezone.utc).isoformat()
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).isoformat()
    return value.isoformat()


def _catalog_scheme(scheme_id: str):
    try:
        record = next(
            (item for item in get_scheme_service().list_catalog() if item.scheme_id == scheme_id),
            None,
        )
    except CatalogUnavailableError as exc:
        raise ApplicationNotFoundError("No catalog scheme was found for that identifier.") from exc
    if record is None:
        raise ApplicationNotFoundError("No catalog scheme was found for that identifier.")
    return record


def _public(row: ApplicationTrackingRecord) -> ApplicationItem:
    scheme = _catalog_scheme(row.scheme_id)
    status: ApplicationStatus = row.status if row.status in APPLICATION_STATUSES else "planning"
    return ApplicationItem(
        application_id=row.id,
        scheme_id=scheme.scheme_id,
        scheme_name=scheme.scheme_name,
        department=scheme.department,
        required_documents=scheme.required_documents,
        official_source_url=scheme.official_source_url,
        status=status,
        application_date=row.application_date,
        created_at=_iso(row.created_at),
        updated_at=_iso(row.updated_at),
        disclaimer=APPLICATION_DISCLAIMER,
    )


def list_applications(session: Session, user_id: str) -> ApplicationListResponse:
    try:
        rows = (
            session.query(ApplicationTrackingRecord)
            .filter(ApplicationTrackingRecord.user_id == user_id)
            .order_by(ApplicationTrackingRecord.updated_at.desc())
            .all()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The application tracking database is unavailable.") from exc
    items = [_public(row) for row in rows]
    return ApplicationListResponse(applications=items, count=len(items), disclaimer=APPLICATION_DISCLAIMER)


def create_application(
    session: Session,
    user_id: str,
    scheme_id: str,
    status: ApplicationStatus,
    application_date: date | None,
) -> ApplicationItem:
    _catalog_scheme(scheme_id)
    row = ApplicationTrackingRecord(
        user_id=user_id,
        scheme_id=scheme_id,
        status=status,
        application_date=application_date,
    )
    session.add(row)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        raise ApplicationConflictError("This scheme is already saved for application tracking.") from exc
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The application tracking database is unavailable.") from exc
    session.refresh(row)
    return _public(row)


def update_application(
    session: Session,
    user_id: str,
    application_id: str,
    status: ApplicationStatus | None,
    application_date: date | None,
) -> ApplicationItem:
    try:
        row = (
            session.query(ApplicationTrackingRecord)
            .filter(
                ApplicationTrackingRecord.id == application_id,
                ApplicationTrackingRecord.user_id == user_id,
            )
            .one_or_none()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The application tracking database is unavailable.") from exc
    if row is None:
        raise ApplicationNotFoundError("No application tracking record was found.")
    if status is not None:
        row.status = status
    if application_date is not None:
        row.application_date = application_date
    try:
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The application tracking database is unavailable.") from exc
    session.refresh(row)
    return _public(row)


def delete_application(session: Session, user_id: str, application_id: str) -> None:
    try:
        row = (
            session.query(ApplicationTrackingRecord)
            .filter(
                ApplicationTrackingRecord.id == application_id,
                ApplicationTrackingRecord.user_id == user_id,
            )
            .one_or_none()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The application tracking database is unavailable.") from exc
    if row is None:
        raise ApplicationNotFoundError("No application tracking record was found.")
    session.delete(row)
    try:
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The application tracking database is unavailable.") from exc


def delete_applications_for_user(session: Session, user_id: str) -> None:
    session.query(ApplicationTrackingRecord).filter(ApplicationTrackingRecord.user_id == user_id).delete(
        synchronize_session=False
    )
