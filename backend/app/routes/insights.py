"""Authenticated eligibility-insights route. Uses the caller's wallet only."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.insights import InsightsResponse
from app.services.insights_service import build_eligibility_insights

router = APIRouter(prefix="/api/v1", tags=["insights"])

_PROTOTYPE_NOTE = (
    "Requires a JWT. Loads the caller's socio-economic wallet and evaluates "
    "the six CORE schemes with the existing hybrid Rule + ML engine. "
    "Results are not stored and are not government approval. "
    "The documented rule remains the reference when Rule and ML differ."
)


@router.get(
    "/insights",
    response_model=InsightsResponse,
    summary="Explain hybrid eligibility results for the authenticated wallet",
    description=_PROTOTYPE_NOTE,
)
def read_eligibility_insights(
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> InsightsResponse:
    return build_eligibility_insights(require_db(session), current_user.id)
