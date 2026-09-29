"""Authenticated read-only scheme agent. Coordinates existing owner-scoped services."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.scheme_agent import AgentRunRequest, AgentRunResponse, AgentStatusResponse
from app.services.scheme_agent_service import agent_status, run_agent

router = APIRouter(prefix="/api/v1/scheme-agent", tags=["scheme-agent"])

_NOTE = (
    "Requires a JWT. The agent reads the signed-in citizen's records and existing "
    "catalog, knowledge, eligibility, document, and application services only. "
    "It does not update data, submit government applications, or store chat history."
)


@router.get(
    "/status",
    response_model=AgentStatusResponse,
    summary="Scheme agent capability and allowed tools",
    description=_NOTE,
)
def read_agent_status(
    current_user: UserRecord = Depends(get_current_user),
) -> AgentStatusResponse:
    _ = current_user
    return agent_status()


@router.post(
    "/run",
    response_model=AgentRunResponse,
    summary="Run one read-only agent task against existing services",
    description=_NOTE,
)
def create_agent_run(
    payload: AgentRunRequest,
    current_user: UserRecord = Depends(get_current_user),
    session: Session | None = Depends(get_db),
) -> AgentRunResponse:
    return run_agent(session, current_user.id, payload)
