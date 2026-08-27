"""Request and response models for multi-scheme recommendation."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.prediction import CitizenProfile, PredictionLabel, RuleResultPayload, SchemeId

RANKING_RULE = "eligible_probability descending, then scheme_id ascending"

RECOMMENDATION_DISCLAIMER = (
    "This is a research prototype. Training data is synthetic. Labels are "
    "derived from documented eligibility rules. A prediction is not government "
    "approval or a final eligibility determination. Users should verify current "
    "eligibility with the official government source."
)

CITIZEN_EXAMPLE = {
    "age": 20,
    "gender": "female",
    "is_student": True,
    "first_higher_education_course": True,
    "school_background": "government_6_to_12",
    "marital_status": "never_married",
    "is_orphan": False,
    "is_destitute": False,
    "occupation_category": "other",
    "wet_land_acres": 0.0,
    "dry_land_acres": 0.0,
}


class RecommendRequest(CitizenProfile):
    """Citizen profile only. The API evaluates every CORE scheme."""

    model_config = ConfigDict(json_schema_extra={"example": CITIZEN_EXAMPLE})


class RecommendedScheme(BaseModel):
    scheme_id: SchemeId
    scheme_name: str
    department: str | None = None
    scheme_category: str | None = None
    description: str | None = None
    prediction: Literal["eligible"]
    status_label: Literal["Predicted eligible"]
    eligible_probability: float = Field(..., ge=0.0, le=1.0)
    not_eligible_probability: float = Field(..., ge=0.0, le=1.0)
    reason: str
    benefit: str | None = None
    required_documents: str | None = None
    application_method: str | None = None
    official_source_url: str | None = None
    rule_result: RuleResultPayload
    rule_reasons: list[str]
    ml_prediction: PredictionLabel
    agreement: bool


class EvaluatedScheme(BaseModel):
    scheme_id: SchemeId
    scheme_name: str
    prediction: PredictionLabel
    eligible_probability: float = Field(..., ge=0.0, le=1.0)
    not_eligible_probability: float = Field(..., ge=0.0, le=1.0)
    reason: str
    rule_eligible: bool
    ml_prediction: PredictionLabel
    agreement: bool


class RecommendResponse(BaseModel):
    total_schemes_evaluated: int
    eligible_scheme_count: int
    ranking_rule: str
    recommendations: list[RecommendedScheme]
    evaluated_schemes: list[EvaluatedScheme]
    disclaimer: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_schemes_evaluated": 6,
                "eligible_scheme_count": 1,
                "ranking_rule": RANKING_RULE,
                "recommendations": [
                    {
                        "scheme_id": "TN-SW-001",
                        "scheme_name": (
                            "Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam"
                        ),
                        "department": "Social Welfare and Women Empowerment Department",
                        "scheme_category": "Higher education assurance",
                        "description": (
                            "Higher education assurance scheme to raise enrolment of "
                            "girl students from Government schools."
                        ),
                        "prediction": "eligible",
                        "status_label": "Predicted eligible",
                        "eligible_probability": 1.0,
                        "not_eligible_probability": 0.0,
                        "reason": (
                            "Eligible for Pudhumai Penn because the citizen is female, "
                            "is_student=True, first_higher_education_course=True, and "
                            "school_background=government_6_to_12."
                        ),
                        "benefit": "Rs. 1,000 per month by Direct Benefit Transfer.",
                        "required_documents": "NEEDS VERIFICATION",
                        "application_method": "Online through the Penkalvi portal.",
                        "official_source_url": (
                            "https://www.tnsocialwelfare.tn.gov.in/en/"
                            "specilisationswoman-welfare/pudhumai-penn"
                        ),
                    }
                ],
                "evaluated_schemes": [],
                "disclaimer": RECOMMENDATION_DISCLAIMER,
            }
        }
    )


class SchemeCatalogItem(BaseModel):
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


class SchemeCatalogResponse(BaseModel):
    scheme_count: int
    schemes: list[SchemeCatalogItem]
