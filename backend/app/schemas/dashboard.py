"""Pydantic models for the personalized progress dashboard. Read-only aggregation."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

JourneyKey = Literal[
    "profile_created",
    "profile_completed",
    "eligibility_checked",
    "schemes_recommended",
    "documents_prepared",
    "application_readiness",
]

JourneyStatus = Literal["completed", "current", "pending"]

DashboardActivityKind = Literal["recommendation", "document", "readiness"]

DASHBOARD_DISCLAIMER = (
    "This dashboard summarizes your research-prototype progress only. "
    "It is not government approval, application submission, or official verification."
)

JOURNEY_KEYS: tuple[JourneyKey, ...] = (
    "profile_created",
    "profile_completed",
    "eligibility_checked",
    "schemes_recommended",
    "documents_prepared",
    "application_readiness",
)


class DashboardProgress(BaseModel):
    profile_completeness_percent: int = Field(..., ge=0, le=100)
    eligibility_checked: bool
    latest_recommendation_count: int = Field(..., ge=0)
    document_progress_percent: int = Field(..., ge=0, le=100)
    readiness_progress_percent: int = Field(..., ge=0, le=100)


class DashboardJourneyStep(BaseModel):
    key: JourneyKey
    status: JourneyStatus


class DashboardSummary(BaseModel):
    total_recommended_schemes: int = Field(..., ge=0)
    schemes_being_prepared: int = Field(..., ge=0)
    schemes_with_document_progress: int = Field(..., ge=0)
    overall_preparation_progress: int = Field(..., ge=0, le=100)


class DashboardActivityItem(BaseModel):
    kind: DashboardActivityKind
    occurred_at: str
    scheme_id: str | None = None
    scheme_name: str | None = None
    recommendation_count: int | None = None
    history_id: str | None = None
    document_progress_percent: int | None = None
    readiness_stage: str | None = None


class DashboardOverviewResponse(BaseModel):
    has_wallet: bool
    progress: DashboardProgress
    journey: list[DashboardJourneyStep]
    summary: DashboardSummary
    activity: list[DashboardActivityItem]
    disclaimer: str
