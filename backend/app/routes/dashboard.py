"""Authenticated personalized-progress dashboard. Owner-only aggregation."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.dashboard import DashboardOverviewResponse
from app.services.dashboard_service import build_dashboard_overview

router = APIRouter(prefix="/api/v1", tags=["dashboard"])

_PROTOTYPE_NOTE = (
    "Requires a JWT. Returns the caller's wallet, history, document, and "
    "readiness progress only. This is not government approval or submission."
)


@router.get(
    "/dashboard",
    response_model=DashboardOverviewResponse,
    summary="Summarize the authenticated user's personalized progress",
    description=_PROTOTYPE_NOTE,
)
def read_dashboard_overview(
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> DashboardOverviewResponse:
    return build_dashboard_overview(require_db(session), current_user.id)
