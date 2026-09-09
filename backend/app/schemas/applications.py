"""Pydantic models for owner-only application tracking."""

from __future__ import annotations

from datetime import date
from typing import Literal

from pydantic import BaseModel, Field

ApplicationStatus = Literal[
    "not_applied",
    "planning",
    "documents_ready",
    "applied",
    "under_review",
    "approved",
    "rejected",
]

APPLICATION_STATUSES: tuple[ApplicationStatus, ...] = (
    "not_applied",
    "planning",
    "documents_ready",
    "applied",
    "under_review",
    "approved",
    "rejected",
)

APPLICATION_DISCLAIMER = (
    "This is personal application tracking for the research prototype only. "
    "Nothing is submitted to any government portal and this is not an "
    "official eligibility or approval decision."
)


class ApplicationCreate(BaseModel):
    scheme_id: str = Field(..., min_length=1, max_length=32)
    status: ApplicationStatus = "planning"
    application_date: date | None = None


class ApplicationUpdate(BaseModel):
    status: ApplicationStatus | None = None
    application_date: date | None = None


class ApplicationItem(BaseModel):
    application_id: str
    scheme_id: str
    scheme_name: str
    department: str | None = None
    required_documents: str | None = None
    official_source_url: str | None = None
    status: ApplicationStatus
    application_date: date | None = None
    created_at: str
    updated_at: str
    disclaimer: str = APPLICATION_DISCLAIMER


class ApplicationListResponse(BaseModel):
    applications: list[ApplicationItem]
    count: int = Field(..., ge=0)
    disclaimer: str = APPLICATION_DISCLAIMER
