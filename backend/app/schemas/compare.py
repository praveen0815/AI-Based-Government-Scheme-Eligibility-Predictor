"""Pydantic models for CORE scheme comparison."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.prediction import PredictionLabel, RuleResultPayload, SchemeId
from app.schemas.recommendation import RECOMMENDATION_DISCLAIMER

COMPARE_DISCLAIMER = RECOMMENDATION_DISCLAIMER
PREDICTED_ELIGIBLE_LABEL = "Predicted eligible"
NOT_RECOMMENDED_LABEL = "Not recommended by this prototype"


class CompareRequest(BaseModel):
    scheme_ids: list[SchemeId] = Field(..., min_length=2, max_length=3)

    @field_validator("scheme_ids")
    @classmethod
    def unique_scheme_ids(cls, value: list[SchemeId]) -> list[SchemeId]:
        if len(set(value)) != len(value):
            raise ValueError("Scheme IDs must be unique.")
        return value

    model_config = ConfigDict(
        json_schema_extra={"example": {"scheme_ids": ["TN-SW-001", "TN-SW-006"]}}
    )


class ComparedScheme(BaseModel):
    scheme_id: SchemeId
    scheme_name: str
    department: str | None = None
    scheme_category: str | None = None
    description: str | None = None
    eligibility_notes: str | None = None
    benefit: str | None = None
    required_documents: str | None = None
    application_method: str | None = None
    official_source_url: str | None = None
    recommended: bool
    status_label: str
    prediction: PredictionLabel
    eligible_probability: float = Field(..., ge=0.0, le=1.0)
    not_eligible_probability: float = Field(..., ge=0.0, le=1.0)
    reason: str
    rule_result: RuleResultPayload
    rule_reasons: list[str]
    ml_prediction: PredictionLabel
    agreement: bool


class CompareResponse(BaseModel):
    scheme_count: int = Field(..., ge=2, le=3)
    schemes: list[ComparedScheme]
    disclaimer: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scheme_count": 2,
                "schemes": [],
                "disclaimer": COMPARE_DISCLAIMER,
            }
        }
    )
