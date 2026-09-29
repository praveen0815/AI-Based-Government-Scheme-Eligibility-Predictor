"""Authenticated scheme assistant. Knowledge retrieval is separate from LLM wording."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.scheme_assistant import AssistantChatRequest, AssistantChatResponse, AssistantStatusResponse
from app.services.scheme_assistant_service import assistant_status, chat

router = APIRouter(prefix="/api/v1/scheme-assistant", tags=["scheme-assistant"])

_NOTE = (
    "Requires a JWT. Answers repeat source-backed scheme knowledge only. "
    "The assistant does not predict, approve, or reject eligibility and does not store chat history."
)


@router.get(
    "/status",
    response_model=AssistantStatusResponse,
    summary="Scheme assistant capability for the signed-in citizen",
    description=_NOTE,
)
def read_assistant_status(
    current_user: UserRecord = Depends(get_current_user),
) -> AssistantStatusResponse:
    _ = current_user
    return assistant_status()


@router.post(
    "/chat",
    response_model=AssistantChatResponse,
    summary="Answer a scheme question from retrieved knowledge, then optional LLM wording",
    description=_NOTE,
)
def create_assistant_chat(
    payload: AssistantChatRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> AssistantChatResponse:
    return chat(session, current_user.id, payload)
