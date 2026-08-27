"""Pydantic models for eligibility insights. Not a new ranking or eligibility API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.compare import NOT_RECOMMENDED_LABEL, PREDICTED_ELIGIBLE_LABEL
from app.schemas.completeness import ProfileCompletenessResponse
from app.schemas.prediction import PredictionLabel
from app.schemas.recommendation import RECOMMENDATION_DISCLAIMER

INSIGHTS_DISCLAIMER = (
    f"{RECOMMENDATION_DISCLAIMER} Eligibility Insights explain this prototype's "
    "hybrid evaluation of the saved wallet. They are not government approval."
)

InsightReviewCode = Literal[
    "verify_profile",
    "complete_profile",
    "review_official_source",
    "review_disagreement",
]


class InsightScheme(BaseModel):
    scheme_id: str
    scheme_name: str
    official_source_url: str | None = None
    status_label: Literal["Predicted eligible", "Not recommended by this prototype"]
    predicted_eligible: bool
    reason: str
    rule_reasons: list[str]
    rule_eligible: bool
    ml_prediction: PredictionLabel
    eligible_probability: float = Field(..., ge=0.0, le=1.0)
    not_eligible_probability: float = Field(..., ge=0.0, le=1.0)
    agreement: bool


class InsightReviewItem(BaseModel):
    code: InsightReviewCode
    text: str


class InsightsResponse(BaseModel):
    total_schemes_evaluated: int = Field(..., ge=0)
    predicted_eligible_count: int = Field(..., ge=0)
    not_recommended_count: int = Field(..., ge=0)
    recommended_schemes: list[InsightScheme]
    other_schemes: list[InsightScheme]
    completeness: ProfileCompletenessResponse
    review_items: list[InsightReviewItem]
    disclaimer: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "total_schemes_evaluated": 6,
                "predicted_eligible_count": 1,
                "not_recommended_count": 5,
                "recommended_schemes": [
                    {
                        "scheme_id": "TN-SW-001",
                        "scheme_name": "Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam",
                        "status_label": PREDICTED_ELIGIBLE_LABEL,
                        "predicted_eligible": True,
                        "reason": "Documented scheme conditions satisfied.",
                        "rule_reasons": ["female", "student"],
                        "rule_eligible": True,
                        "ml_prediction": "eligible",
                        "eligible_probability": 1.0,
                        "not_eligible_probability": 0.0,
                        "agreement": True,
                    }
                ],
                "other_schemes": [],
                "completeness": {
                    "percentage": 100,
                    "completed_fields": 11,
                    "total_fields": 11,
                    "incomplete_fields": [],
                },
                "review_items": [
                    {
                        "code": "verify_profile",
                        "text": "Verify that the saved socio-economic profile is current.",
                    }
                ],
                "disclaimer": INSIGHTS_DISCLAIMER,
            }
        }
    )
