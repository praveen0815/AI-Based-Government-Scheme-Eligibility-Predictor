"""AI Scheme Agent models. The agent coordinates existing APIs and is not an eligibility engine."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.schemas.scheme_assistant import (
    MAX_HISTORY_TURNS,
    MAX_MESSAGE_CHARS,
    AssistantAction,
    AssistantHistoryTurn,
    AssistantLanguage,
    AssistantSource,
)

AgentIntent = Literal[
    "PROFILE_COMPLETENESS",
    "FIND_SCHEMES",
    "CHECK_ELIGIBILITY",
    "DOCUMENT_READINESS",
    "APPLICATION_STATUS",
    "EXPLAIN_SCHEME",
    "GENERAL_HELP",
    "CLARIFY",
    "UNSUPPORTED",
]

AGENT_DISCLAIMER = (
    "This agent coordinates existing research-prototype services only. "
    "Eligibility comes only from the Hybrid Rule + ML checker. "
    "Results are predictions, not government approval, and the agent does not "
    "update wallets, documents, or applications."
)

ALLOWED_AGENT_TOOLS: tuple[str, ...] = (
    "get_profile_completeness",
    "search_schemes",
    "check_eligibility",
    "get_scheme_knowledge",
    "get_document_readiness",
    "get_application_status",
)


class AgentRunRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CHARS)
    language: AssistantLanguage = "en"
    scheme_id: str | None = Field(default=None, max_length=32)
    history: list[AssistantHistoryTurn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Enter a request for the scheme agent.")
        return cleaned

    @field_validator("scheme_id")
    @classmethod
    def strip_scheme_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class AgentToolStep(BaseModel):
    tool: str
    status: Literal["ok", "skipped", "error"]
    summary: str


class AgentRunResponse(BaseModel):
    reply: str
    language: AssistantLanguage
    intent: AgentIntent
    llm_used: bool
    provider: Literal["llm", "template"]
    agent_ran: bool
    tools_used: list[str] = Field(default_factory=list)
    steps: list[AgentToolStep] = Field(default_factory=list)
    scheme_id: str | None = None
    scheme_name: str | None = None
    sources: list[AssistantSource] = Field(default_factory=list)
    actions: list[AssistantAction] = Field(default_factory=list)
    notice: str | None = None
    disclaimer: str


class AgentStatusResponse(BaseModel):
    llm_configured: bool
    llm_model: str | None = None
    fallback: Literal["template"] = "template"
    read_only: bool = True
    allowed_tools: list[str]
    disclaimer: str
