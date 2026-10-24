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


EligibilityOutcome = Literal["eligible_under_rules", "ineligible_under_rules", "insufficient_information"]
ConditionOutcome = Literal["met", "not_met", "unknown"]
ReadinessState = Literal[
    "insufficient_information",
    "ineligible_under_rules",
    "missing_mandatory_documents",
    "unverified_requirements",
    "eligible_under_rules",
]
DocumentCitizenStatus = Literal["not_started", "ready", "needs_verification"]

READINESS_EVALUATION_DISCLAIMER = (
    "Readiness evaluation combines the documented rule result, your saved profile, your own "
    "document checklist and the verification status of official requirements. Eligibility comes "
    "only from the documented rule engine; the Decision Tree is an independent comparison. "
    "Missing information is never treated as ineligibility. This is not government approval."
)

STAGES_CLAIMING_READY: frozenset[str] = frozenset(
    {"ready_to_apply", "official_source_visited", "completed_preparation"}
)


class EvaluatedCondition(BaseModel):
    key: str
    label: str
    outcome: ConditionOutcome
    rule_reason: str | None = None
    profile_fields: list[str]
    verification_status: str
    basis: str
    note: str | None = None


class EligibilitySection(BaseModel):
    outcome: EligibilityOutcome
    rule_status: str | None = None
    conditions: list[EvaluatedCondition]
    verification_notes: str | None = None


class ProfileSection(BaseModel):
    has_wallet: bool
    required_fields: list[str]
    missing_fields: list[str]


class EvaluatedDocument(BaseModel):
    key: str
    label: str
    requirement: str
    verification_status: str
    citizen_status: DocumentCitizenStatus


class DocumentsSection(BaseModel):
    documents_status: str
    items: list[EvaluatedDocument]
    mandatory_missing: list[str]
    requirement_level_unspecified: bool


class MlComparison(BaseModel):
    prediction: str
    eligible_probability: float = Field(..., ge=0.0, le=1.0)
    agrees_with_rule: bool
    note: str = "Independent Decision Tree prediction for comparison only. It never changes the rule result."


class ManualStageSection(BaseModel):
    stage: ReadinessStage | None = None
    consistent_with_evaluation: bool
    note: str | None = None


class SchemeReadinessEvaluation(BaseModel):
    scheme_id: str
    scheme_name: str
    readiness_state: ReadinessState
    blocking_reasons: list[str]
    eligibility: EligibilitySection
    profile: ProfileSection
    documents: DocumentsSection
    unverified_requirements: list[str]
    application_steps: list[str]
    official_source_url: str | None = None
    ml_comparison: MlComparison | None = None
    manual_stage: ManualStageSection
    last_checked: str | None = None
    disclaimer: str = READINESS_EVALUATION_DISCLAIMER


class ReadinessEvaluationListResponse(BaseModel):
    schemes: list[SchemeReadinessEvaluation]
    count: int = Field(..., ge=0)
    disclaimer: str = READINESS_EVALUATION_DISCLAIMER
