"""Scheme assistant request and response models. Not an eligibility engine."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

AssistantLanguage = Literal["en", "ta"]
AssistantRole = Literal["user", "assistant"]

ASSISTANT_DISCLAIMER = (
    "This assistant repeats official catalog knowledge only. "
    "It does not predict, approve, or reject eligibility. "
    "Use the existing eligibility checker for personal results, and confirm facts on the official source page."
)

MAX_MESSAGE_CHARS = 1000
MAX_HISTORY_TURNS = 8


class AssistantHistoryTurn(BaseModel):
    role: AssistantRole
    content: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CHARS)


class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=MAX_MESSAGE_CHARS)
    language: AssistantLanguage = "en"
    scheme_id: str | None = Field(default=None, max_length=32)
    history: list[AssistantHistoryTurn] = Field(default_factory=list, max_length=MAX_HISTORY_TURNS)

    @field_validator("message")
    @classmethod
    def strip_message(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("Enter a question for the scheme assistant.")
        return cleaned

    @field_validator("scheme_id")
    @classmethod
    def strip_scheme_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class AssistantSource(BaseModel):
    scheme_id: str
    scheme_name: str
    field_key: str
    label: str
    source_url: str | None = None
    verification_status: str
    last_verified_at: str | None = None
    content_state: str


class AssistantAction(BaseModel):
    label: str
    path: str


class AssistantChatResponse(BaseModel):
    reply: str
    language: AssistantLanguage
    intent: str
    llm_used: bool
    provider: Literal["llm", "template"]
    scheme_id: str | None = None
    scheme_name: str | None = None
    sources: list[AssistantSource] = Field(default_factory=list)
    actions: list[AssistantAction] = Field(default_factory=list)
    notice: str | None = None
    disclaimer: str


class AssistantStatusResponse(BaseModel):
    llm_configured: bool
    llm_model: str | None = None
    fallback: Literal["template"] = "template"
    disclaimer: str
