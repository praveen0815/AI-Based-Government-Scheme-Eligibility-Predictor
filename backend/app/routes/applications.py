"""Authenticated application-tracking routes. Users may only access their own rows."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.applications import ApplicationCreate, ApplicationItem, ApplicationListResponse, ApplicationUpdate
from app.services.application_service import (
    create_application,
    delete_application,
    list_applications,
    update_application,
)

router = APIRouter(prefix="/api/v1", tags=["applications"])

_PROTOTYPE_NOTE = (
    "Requires a JWT. A user can only create, read, update, or delete their own "
    "application-tracking rows. This does not submit applications to government portals."
)


@router.get(
    "/applications",
    response_model=ApplicationListResponse,
    summary="List the caller's saved application-tracking rows",
    description=_PROTOTYPE_NOTE,
)
def read_applications(
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> ApplicationListResponse:
    return list_applications(require_db(session), current_user.id)


@router.post(
    "/applications",
    response_model=ApplicationItem,
    status_code=201,
    summary="Save a catalog scheme for personal application tracking",
    description=_PROTOTYPE_NOTE,
)
def post_application(
    payload: ApplicationCreate,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> ApplicationItem:
    return create_application(
        require_db(session),
        current_user.id,
        payload.scheme_id,
        payload.status,
        payload.application_date,
    )


@router.patch(
    "/applications/{application_id}",
    response_model=ApplicationItem,
    summary="Update the caller's application-tracking status",
    description=_PROTOTYPE_NOTE,
)
def patch_application(
    application_id: str,
    payload: ApplicationUpdate,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> ApplicationItem:
    return update_application(
        require_db(session),
        current_user.id,
        application_id,
        payload.status,
        payload.application_date,
    )


@router.delete(
    "/applications/{application_id}",
    status_code=204,
    summary="Remove one of the caller's application-tracking rows",
    description=_PROTOTYPE_NOTE,
)
def remove_application(
    application_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> Response:
    delete_application(require_db(session), current_user.id, application_id)
    return Response(status_code=204)
