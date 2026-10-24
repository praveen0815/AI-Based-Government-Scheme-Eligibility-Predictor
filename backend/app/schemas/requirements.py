"""Scheme Requirements Registry payloads. Describes requirements; never decides eligibility."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

RequirementVerificationStatus = Literal["verified", "unverified", "missing"]
ConditionBasis = Literal["official_source", "department_convention", "project_interpretation"]
DocumentRequirementLevel = Literal["mandatory", "optional", "unspecified"]
DocumentListStatus = Literal["listed", "missing"]

REQUIREMENTS_DISCLAIMER = (
    "Requirements repeat the official catalog and the documented rule conditions only. "
    "Unverified or missing items have not been confirmed against an official source. "
    "This is not an eligibility decision or government approval."
)


class RequirementCondition(BaseModel):
    key: str
    label: str
    profile_fields: list[str]
    verification_status: RequirementVerificationStatus
    basis: ConditionBasis
    note: str | None = None


class InformationNotChecked(BaseModel):
    key: str
    label: str
    verification_status: RequirementVerificationStatus
    note: str | None = None


class RequirementDocument(BaseModel):
    key: str
    label: str
    requirement: DocumentRequirementLevel
    verification_status: RequirementVerificationStatus
    source_url: str | None = None
    last_verified_at: str | None = None


class ApplicationStep(BaseModel):
    key: str
    order: int = Field(..., ge=1)
    text: str
    verification_status: RequirementVerificationStatus
    source_url: str | None = None
    last_verified_at: str | None = None


class OfficialLink(BaseModel):
    url: str
    origin: Literal["official_source_url", "eligibility_notes", "application_method"]


class SchemeRequirements(BaseModel):
    scheme_id: str
    scheme_name: str
    department: str | None = None
    ml_scope: str
    rule_evaluated: bool
    rule_status: str | None = None
    conditions: list[RequirementCondition]
    required_profile_fields: list[str]
    information_not_checked: list[InformationNotChecked]
    documents_status: DocumentListStatus
    documents: list[RequirementDocument]
    application_steps: list[ApplicationStep]
    official_source_url: str | None = None
    official_links: list[OfficialLink]
    eligibility_notes: str | None = None
    last_checked: str | None = None
    unverified_items: list[str]
    disclaimer: str = REQUIREMENTS_DISCLAIMER


class SchemeRequirementsListResponse(BaseModel):
    scheme_count: int = Field(..., ge=0)
    schemes: list[SchemeRequirements]
    disclaimer: str = REQUIREMENTS_DISCLAIMER
