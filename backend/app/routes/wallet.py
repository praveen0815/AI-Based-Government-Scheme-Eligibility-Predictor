"""Authenticated wallet routes. Users may only access their own wallet."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.completeness import ProfileCompletenessResponse
from app.schemas.recommendation import RecommendResponse
from app.schemas.wallet import CitizenWalletCreate, CitizenWalletResponse, CitizenWalletUpdate
from app.services.history_service import save_recommendation_history, wallet_profile_snapshot
from app.services.profile_completeness_service import calculate_profile_completeness
from app.services.recommendation_service import recommend_for_citizen
from app.services.wallet_service import (
    create_wallet,
    delete_wallet,
    get_wallet,
    require_wallet_for_user,
    update_wallet,
    wallet_to_citizen_features,
)

router = APIRouter(
    prefix="/api/v1",
    tags=["wallets"],
)

_PROTOTYPE_NOTE = (
    "Requires a JWT. A user can only read or change their own wallet. "
    "Wallets that do not belong to the caller return HTTP 404 so other "
    "wallets cannot be enumerated. Academic prototype only; not government identity."
)


@router.post(
    "/wallets",
    response_model=CitizenWalletResponse,
    status_code=201,
    summary="Create the authenticated user's socio-economic data wallet",
    description=_PROTOTYPE_NOTE,
)
def create_citizen_wallet(
    payload: CitizenWalletCreate,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> CitizenWalletResponse:
    return create_wallet(require_db(session), payload, current_user.id)


@router.get(
    "/wallets/me",
    response_model=CitizenWalletResponse,
    summary="Retrieve the authenticated user's wallet",
    description=_PROTOTYPE_NOTE,
)
def read_my_wallet(
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> CitizenWalletResponse:
    return require_wallet_for_user(require_db(session), current_user.id)


@router.get(
    "/wallets/me/completeness",
    response_model=ProfileCompletenessResponse,
    summary="Measure completeness of the authenticated user's wallet",
    description=(
        f"{_PROTOTYPE_NOTE} Completeness counts present socio-economic fields only. "
        "It is not an eligibility decision."
    ),
)
def read_my_wallet_completeness(
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> ProfileCompletenessResponse:
    wallet = require_wallet_for_user(require_db(session), current_user.id)
    return calculate_profile_completeness(wallet)


@router.get(
    "/wallets/{citizen_id}",
    response_model=CitizenWalletResponse,
    summary="Retrieve a saved data wallet",
    description=_PROTOTYPE_NOTE,
)
def read_citizen_wallet(
    citizen_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> CitizenWalletResponse:
    return get_wallet(require_db(session), citizen_id, current_user.id)


@router.put(
    "/wallets/{citizen_id}",
    response_model=CitizenWalletResponse,
    summary="Update a socio-economic data wallet",
    description=_PROTOTYPE_NOTE,
)
def update_citizen_wallet(
    citizen_id: str,
    payload: CitizenWalletUpdate,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> CitizenWalletResponse:
    return update_wallet(require_db(session), citizen_id, payload, current_user.id)


@router.delete(
    "/wallets/{citizen_id}",
    status_code=204,
    summary="Delete a data wallet",
    description=_PROTOTYPE_NOTE,
)
def delete_citizen_wallet(
    citizen_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> None:
    delete_wallet(require_db(session), citizen_id, current_user.id)


@router.post(
    "/wallets/{citizen_id}/recommend",
    response_model=RecommendResponse,
    summary="Recommend schemes from a stored wallet",
    description=(
        f"{_PROTOTYPE_NOTE} The backend loads the owned wallet from PostgreSQL "
        "and reuses the existing recommendation service."
    ),
)
def recommend_from_wallet(
    citizen_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> RecommendResponse:
    db = require_db(session)
    wallet = get_wallet(db, citizen_id, current_user.id)
    result = recommend_for_citizen(wallet_to_citizen_features(wallet))
    save_recommendation_history(
        db,
        current_user.id,
        wallet_profile_snapshot(wallet),
        [item.scheme_id for item in result.recommendations],
    )
    return result
