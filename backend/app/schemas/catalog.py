"""Read-only scheme catalog search models. Independent from predict/recommend."""

from __future__ import annotations

from pydantic import BaseModel, Field

CATALOG_SEARCH_DISCLAIMER = (
    "This catalog search lists research-prototype scheme records only. "
    "It does not predict eligibility or change documented scheme conditions."
)

UNSPECIFIED_FILTER = "unspecified"


class CatalogSearchItem(BaseModel):
    scheme_id: str
    scheme_name: str
    department: str | None = None
    scheme_category: str | None = None
    description: str | None = None
    benefit_description: str | None = None
    required_documents: str | None = None
    application_method: str | None = None
    official_source_url: str | None = None
    eligibility_notes: str | None = None
    ml_scope: str
    eligibility_rule_status: str | None = None
    gender_requirement: str | None = None
    student_status_requirement: str | None = None


class CatalogFilterOptions(BaseModel):
    ml_scopes: list[str]
    departments: list[str]
    genders: list[str]
    student_statuses: list[str]
    categories: list[str]


class CatalogSearchResponse(BaseModel):
    scheme_count: int = Field(..., ge=0)
    total_catalog_count: int = Field(..., ge=0)
    schemes: list[CatalogSearchItem]
    filters: CatalogFilterOptions
    disclaimer: str
