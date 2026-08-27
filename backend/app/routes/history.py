"""Authenticated recommendation-history routes. Users may only access their own rows."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db, require_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.history import RecommendationHistoryItem, RecommendationHistoryListResponse
from app.services.history_service import (
    delete_history_for_user,
    get_history_for_user,
    list_history_for_user,
)

router = APIRouter(
    prefix="/api/v1",
    tags=["history"],
)

_PROTOTYPE_NOTE = (
    "Requires a JWT. A user can only read or delete their own recommendation "
    "history. Rows that do not belong to the caller return HTTP 404. "
    "Saved results are not recomputed. Academic prototype only."
)


@router.get(
    "/history",
    response_model=RecommendationHistoryListResponse,
    summary="List the authenticated user's recommendation history",
    description=_PROTOTYPE_NOTE,
)
def list_recommendation_history(
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> RecommendationHistoryListResponse:
    history = list_history_for_user(require_db(session), current_user.id)
    return RecommendationHistoryListResponse(count=len(history), history=history)


@router.get(
    "/history/{history_id}",
    response_model=RecommendationHistoryItem,
    summary="Retrieve one recommendation history record",
    description=_PROTOTYPE_NOTE,
)
def read_recommendation_history(
    history_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> RecommendationHistoryItem:
    return get_history_for_user(require_db(session), history_id, current_user.id)


@router.delete(
    "/history/{history_id}",
    status_code=204,
    summary="Delete one recommendation history record",
    description=_PROTOTYPE_NOTE,
)
def delete_recommendation_history(
    history_id: str,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> None:
    delete_history_for_user(require_db(session), history_id, current_user.id)
