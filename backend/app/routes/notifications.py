"""Authenticated notification routes. Users may only access their own reminders."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.notifications import NotificationItem, NotificationListResponse
from app.services.notification_service import (
    delete_notification,
    list_notifications,
    mark_notification_read,
)

router = APIRouter(prefix="/api/v1", tags=["notifications"])

_PROTOTYPE_NOTE = (
    "Requires a JWT. Reminders are generated from the caller's existing "
    "research-prototype data only. They are not government notices."
)


@router.get(
    "/notifications",
    response_model=NotificationListResponse,
    summary="List owner-only research-prototype reminders",
    description=_PROTOTYPE_NOTE,
)
def read_notifications(
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> NotificationListResponse:
    return list_notifications(require_db(session), current_user.id)


@router.patch(
    "/notifications/{notification_id}/read",
    response_model=NotificationItem,
    summary="Mark one owned reminder as read",
    description=_PROTOTYPE_NOTE,
)
def read_notification(
    notification_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> NotificationItem:
    return mark_notification_read(require_db(session), current_user.id, notification_id)


@router.delete(
    "/notifications/{notification_id}",
    status_code=204,
    summary="Dismiss one owned reminder",
    description=_PROTOTYPE_NOTE,
)
def remove_notification(
    notification_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> Response:
    delete_notification(require_db(session), current_user.id, notification_id)
    return Response(status_code=204)
