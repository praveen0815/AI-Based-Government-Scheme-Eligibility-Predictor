"""Derive and store owner-only reminders from existing application data.

Does not send email, SMS, push, or government notices. Does not invent deadlines.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.db.session import DatabaseUnavailableError
from app.models.notifications import NotificationRecord
from app.schemas.notifications import (
    NOTIFICATION_DISCLAIMER,
    NotificationItem,
    NotificationListResponse,
    NotificationType,
    RelatedFeature,
)
from app.services.document_checklist_service import list_document_progress
from app.services.history_service import list_history_for_user
from app.services.profile_completeness_service import calculate_profile_completeness
from app.services.readiness_service import list_readiness
from app.services.wallet_service import get_wallet_for_user

DASHBOARD_PREVIEW_LIMIT = 3


class NotificationNotFoundError(Exception):
    """Raised when a notification is missing or is not owned by the caller."""


@dataclass(frozen=True)
class _Desired:
    source_key: str
    source_version: str
    type: NotificationType
    title: str
    message: str
    related_feature: RelatedFeature
    related_id: str | None
    href: str
    count: int | None


def _iso(value: datetime) -> str:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc).isoformat()
    return value.isoformat()


def _href(feature: RelatedFeature, related_id: str | None) -> str:
    if feature == "wallet":
        return "/wallet"
    if feature == "documents":
        return f"/documents?scheme={related_id}" if related_id else "/documents"
    if feature == "readiness":
        return "/readiness"
    if related_id:
        return f"/history/{related_id}"
    return "/history"


def _public(row: NotificationRecord, count: int | None = None) -> NotificationItem:
    related_feature: RelatedFeature = row.related_feature  # type: ignore[assignment]
    return NotificationItem(
        notification_id=row.id,
        type=row.type,  # type: ignore[arg-type]
        title=row.title,
        message=row.message,
        related_feature=related_feature,
        related_id=row.related_id,
        href=_href(related_feature, row.related_id),
        is_read=row.is_read,
        created_at=_iso(row.created_at),
        count=count,
    )


def _desired_reminders(session: Session, user_id: str) -> list[_Desired]:
    desired: list[_Desired] = []
    wallet = get_wallet_for_user(session, user_id)
    if wallet is None:
        desired.append(
            _Desired(
                source_key="profile",
                source_version="missing",
                type="profile_incomplete",
                title="Create your profile",
                message=(
                    "A socio-economic wallet is needed before this research prototype "
                    "can prepare personalized reminders."
                ),
                related_feature="wallet",
                related_id=None,
                href="/wallet",
                count=None,
            )
        )
    else:
        completeness = calculate_profile_completeness(wallet)
        if completeness.percentage < 100:
            desired.append(
                _Desired(
                    source_key="profile",
                    source_version=f"incomplete:{completeness.percentage}",
                    type="profile_incomplete",
                    title="Complete your profile",
                    message=(
                        f"Your research-prototype profile is {completeness.percentage}% complete. "
                        "Missing fields are not a government requirement."
                    ),
                    related_feature="wallet",
                    related_id=None,
                    href="/wallet",
                    count=completeness.total_fields - completeness.completed_fields,
                )
            )

    documents = list_document_progress(session, user_id)
    attention = [
        scheme
        for scheme in documents.schemes
        if scheme.documents_need_verification or (scheme.has_saved_progress and scheme.progress_percent < 100)
    ]
    if attention:
        first = attention[0]
        desired.append(
            _Desired(
                source_key="document",
                source_version=f"count:{len(attention)}:{first.scheme_id}:{first.progress_percent}",
                type="document_attention",
                title="Document preparation needs attention",
                message=(
                    f"{len(attention)} recommended scheme"
                    f"{'' if len(attention) == 1 else 's'} still have document checklist "
                    "items to review. This is not a government deadline."
                ),
                related_feature="documents",
                related_id=first.scheme_id,
                href=_href("documents", first.scheme_id),
                count=len(attention),
            )
        )

    readiness = list_readiness(session, user_id)
    in_progress = [
        scheme
        for scheme in readiness.schemes
        if scheme.has_saved_progress and scheme.stage != "completed_preparation"
    ]
    if in_progress:
        first = in_progress[0]
        desired.append(
            _Desired(
                source_key="readiness",
                source_version=f"count:{len(in_progress)}:{first.scheme_id}:{first.stage}",
                type="readiness_in_progress",
                title="Application readiness is still in progress",
                message=(
                    f"{len(in_progress)} recommended scheme"
                    f"{'' if len(in_progress) == 1 else 's'} are not marked Completed Preparation. "
                    "This is not a government submission."
                ),
                related_feature="readiness",
                related_id=first.scheme_id,
                href="/readiness",
                count=len(in_progress),
            )
        )

    history = list_history_for_user(session, user_id)
    if history:
        latest = history[0]
        desired.append(
            _Desired(
                source_key=f"recommendation:{latest.id}",
                source_version=latest.id,
                type="recommendation",
                title="Latest eligibility check",
                message=(
                    f"Your latest check predicted {latest.recommendation_count} eligible scheme"
                    f"{'' if latest.recommendation_count == 1 else 's'}. "
                    "This is not government approval."
                ),
                related_feature="history",
                related_id=latest.id,
                href=_href("history", latest.id),
                count=latest.recommendation_count,
            )
        )
    return desired


def _sync_notifications(session: Session, user_id: str) -> dict[str, int]:
    """Create or refresh derived reminders. Returns source_key -> optional count."""
    desired = _desired_reminders(session, user_id)
    wanted_keys = {item.source_key for item in desired}
    counts = {item.source_key: item.count for item in desired if item.count is not None}
    try:
        existing = (
            session.query(NotificationRecord)
            .filter(NotificationRecord.user_id == user_id)
            .all()
        )
        by_key = {row.source_key: row for row in existing}
        for row in existing:
            if row.source_key not in wanted_keys:
                session.delete(row)

        now = datetime.now(timezone.utc)
        for item in desired:
            row = by_key.get(item.source_key)
            if row is None:
                session.add(
                    NotificationRecord(
                        user_id=user_id,
                        type=item.type,
                        title=item.title,
                        message=item.message,
                        related_feature=item.related_feature,
                        related_id=item.related_id,
                        source_key=item.source_key,
                        source_version=item.source_version,
                        is_read=False,
                        dismissed=False,
                        created_at=now,
                    )
                )
                continue
            if row.source_version != item.source_version:
                row.type = item.type
                row.title = item.title
                row.message = item.message
                row.related_feature = item.related_feature
                row.related_id = item.related_id
                row.source_version = item.source_version
                row.is_read = False
                row.dismissed = False
                row.created_at = now
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The notifications database is unavailable.") from exc
    return {key: value for key, value in counts.items() if value is not None}


def _owned_row(session: Session, user_id: str, notification_id: str) -> NotificationRecord:
    try:
        row = (
            session.query(NotificationRecord)
            .filter(
                NotificationRecord.id == notification_id,
                NotificationRecord.user_id == user_id,
                NotificationRecord.dismissed.is_(False),
            )
            .one_or_none()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The notifications database is unavailable.") from exc
    if row is None:
        raise NotificationNotFoundError("No notification was found.")
    return row


def list_notifications(session: Session, user_id: str) -> NotificationListResponse:
    counts = _sync_notifications(session, user_id)
    try:
        rows = (
            session.query(NotificationRecord)
            .filter(
                NotificationRecord.user_id == user_id,
                NotificationRecord.dismissed.is_(False),
            )
            .order_by(NotificationRecord.created_at.desc())
            .all()
        )
    except (OperationalError, InterfaceError) as exc:
        raise DatabaseUnavailableError("The notifications database is unavailable.") from exc
    items = [_public(row, counts.get(row.source_key)) for row in rows]
    return NotificationListResponse(
        notifications=items,
        unread_count=sum(1 for item in items if not item.is_read),
        disclaimer=NOTIFICATION_DISCLAIMER,
    )


def mark_notification_read(session: Session, user_id: str, notification_id: str) -> NotificationItem:
    row = _owned_row(session, user_id, notification_id)
    row.is_read = True
    try:
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The notifications database is unavailable.") from exc
    session.refresh(row)
    return _public(row)


def delete_notification(session: Session, user_id: str, notification_id: str) -> None:
    row = _owned_row(session, user_id, notification_id)
    row.dismissed = True
    try:
        session.commit()
    except (OperationalError, InterfaceError) as exc:
        session.rollback()
        raise DatabaseUnavailableError("The notifications database is unavailable.") from exc


def delete_notifications_for_user(session: Session, user_id: str) -> None:
    session.query(NotificationRecord).filter(NotificationRecord.user_id == user_id).delete(
        synchronize_session=False
    )
