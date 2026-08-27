"""Authenticated CORE scheme comparison. Eligibility is recomputed on the server."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.compare import CompareRequest, CompareResponse
from app.services.compare_service import compare_core_schemes
from app.services.wallet_service import require_wallet_for_user, wallet_to_citizen_features

router = APIRouter(prefix="/api/v1", tags=["compare"])

_PROTOTYPE_NOTE = (
    "Requires a JWT. The backend loads the caller's wallet and recomputes "
    "hybrid Rule + ML results for 2 or 3 CORE schemes. Client-supplied "
    "eligibility labels are ignored. Academic prototype only."
)


@router.post(
    "/compare",
    response_model=CompareResponse,
    summary="Compare 2 or 3 CORE schemes for the authenticated user's wallet",
    description=_PROTOTYPE_NOTE,
)
def compare_schemes(
    payload: CompareRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> CompareResponse:
    wallet = require_wallet_for_user(require_db(session), current_user.id)
    return compare_core_schemes(wallet_to_citizen_features(wallet), list(payload.scheme_ids))
