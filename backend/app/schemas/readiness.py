"""Pydantic models for application readiness tracking. Not government submission."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ReadinessStage = Literal[
    "not_started",
    "profile_ready",
    "documents_in_progress",
    "ready_to_apply",
    "official_source_visited",
    "completed_preparation",
]

READINESS_STAGES: tuple[ReadinessStage, ...] = (
    "not_started",
    "profile_ready",
    "documents_in_progress",
    "ready_to_apply",
    "official_source_visited",
    "completed_preparation",
)

READINESS_DISCLAIMER = (
    "Application Readiness is a research-prototype tracker. "
    "Completed Preparation does not mean the government application was submitted or approved."
)


class ReadinessStageUpdate(BaseModel):
    stage: ReadinessStage

    model_config = ConfigDict(json_schema_extra={"example": {"stage": "documents_in_progress"}})


class SchemeReadiness(BaseModel):
    scheme_id: str
    scheme_name: str
    official_source_url: str | None = None
    stage: ReadinessStage
    stage_index: int = Field(..., ge=0)
    stage_count: int = Field(..., ge=1)
    progress_percent: int = Field(..., ge=0, le=100)
    has_saved_progress: bool
    updated_at: str | None = None
    disclaimer: str


class ReadinessProgressResponse(BaseModel):
    schemes: list[SchemeReadiness]
    schemes_being_prepared: int = Field(..., ge=0)
    overall_progress_percent: int = Field(..., ge=0, le=100)
    disclaimer: str
