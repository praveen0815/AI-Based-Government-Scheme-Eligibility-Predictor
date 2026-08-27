"""Authenticated application-readiness routes. Users may only access their own rows."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.readiness import ReadinessProgressResponse, ReadinessStageUpdate, SchemeReadiness
from app.services.readiness_service import get_scheme_readiness, list_readiness, update_scheme_stage

router = APIRouter(prefix="/api/v1", tags=["readiness"])

_PROTOTYPE_NOTE = (
    "Requires a JWT. A user can only read or update their own application "
    "readiness stages for CORE schemes that appear in their recommendation "
    "history. Completed Preparation is not a government submission or approval."
)


@router.get(
    "/readiness",
    response_model=ReadinessProgressResponse,
    summary="Summarize application readiness for recommended CORE schemes",
    description=_PROTOTYPE_NOTE,
)
def read_readiness(
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> ReadinessProgressResponse:
    return list_readiness(require_db(session), current_user.id)


@router.get(
    "/readiness/schemes/{scheme_id}",
    response_model=SchemeReadiness,
    summary="Return the application readiness stage for one recommended CORE scheme",
    description=_PROTOTYPE_NOTE,
)
def read_scheme_readiness(
    scheme_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> SchemeReadiness:
    return get_scheme_readiness(require_db(session), current_user.id, scheme_id)


@router.patch(
    "/readiness/schemes/{scheme_id}",
    response_model=SchemeReadiness,
    summary="Update the application readiness stage for the authenticated user",
    description=_PROTOTYPE_NOTE,
)
def patch_scheme_readiness(
    scheme_id: str,
    payload: ReadinessStageUpdate,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> SchemeReadiness:
    return update_scheme_stage(require_db(session), current_user.id, scheme_id, payload.stage)
