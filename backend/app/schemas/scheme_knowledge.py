"""Verified scheme knowledge retrieval models. Independent from predict/recommend."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

KnowledgeFieldKey = Literal[
    "scheme_name",
    "department",
    "description",
    "eligibility_notes",
    "required_documents",
    "benefit_description",
    "application_method",
    "official_source_url",
]
KnowledgeVerificationStatus = Literal["verified", "unverified", "missing"]
KnowledgeContentState = Literal["present", "missing", "unverified_placeholder"]

KNOWLEDGE_DISCLAIMER = (
    "This knowledge base repeats official catalog text only. "
    "Catalog presence is not verification. Retrieval does not predict eligibility "
    "or change Hybrid Rule + ML results."
)

KNOWLEDGE_FIELD_LABELS: dict[str, str] = {
    "scheme_name": "Scheme name",
    "department": "Department",
    "description": "Scheme description",
    "eligibility_notes": "Eligibility conditions",
    "required_documents": "Required documents",
    "benefit_description": "Benefit details",
    "application_method": "Application procedure",
    "official_source_url": "Official source URL",
}

KNOWLEDGE_FIELD_KEYS: tuple[KnowledgeFieldKey, ...] = (
    "scheme_name",
    "department",
    "description",
    "eligibility_notes",
    "required_documents",
    "benefit_description",
    "application_method",
    "official_source_url",
)


class SchemeKnowledgeItem(BaseModel):
    field_key: KnowledgeFieldKey
    label: str
    value: str | None = None
    content_state: KnowledgeContentState
    verification_status: KnowledgeVerificationStatus
    source_url: str | None = None
    last_verified_at: str | None = None
    catalog_access_date: str | None = None


class SchemeKnowledgeRecord(BaseModel):
    scheme_id: str
    scheme_name: str
    department: str | None = None
    scheme_category: str | None = None
    ml_scope: str
    catalog_rule_status: str | None = None
    official_source_url: str | None = None
    items: list[SchemeKnowledgeItem]
    disclaimer: str


class SchemeKnowledgeListResponse(BaseModel):
    scheme_count: int = Field(..., ge=0)
    total_catalog_count: int = Field(..., ge=0)
    schemes: list[SchemeKnowledgeRecord]
    departments: list[str]
    categories: list[str]
    disclaimer: str


class SchemeKnowledgeItemUpdate(BaseModel):
    verification_status: KnowledgeVerificationStatus | None = None
    source_url: str | None = None
    last_verified_at: str | None = None

    @field_validator("source_url")
    @classmethod
    def validate_source_url(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if cleaned == "":
            return None
        if not cleaned.startswith(("http://", "https://")):
            raise ValueError("Source URL must be an http or https official page.")
        return cleaned[:500]

    @field_validator("last_verified_at")
    @classmethod
    def validate_last_verified(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None
