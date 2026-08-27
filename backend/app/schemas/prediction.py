"""Request and response models for the prediction API.

Allowed categorical values are imported from ml_config, which documents the
same vocabulary as docs/citizen_feature_specification.md.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.paths import ensure_ml_src_on_path

ensure_ml_src_on_path()

from ml_config import (  # noqa: E402
    AGE_MAX,
    AGE_MIN,
    CORE_SCHEME_IDS,
    GENDER_VALUES,
    LAND_MIN,
    MARITAL_STATUS_VALUES,
    OCCUPATION_CATEGORY_VALUES,
    SCHOOL_BACKGROUND_VALUES,
)

Gender = Literal[*GENDER_VALUES]
SchoolBackground = Literal[*SCHOOL_BACKGROUND_VALUES]
MaritalStatus = Literal[*MARITAL_STATUS_VALUES]
OccupationCategory = Literal[*OCCUPATION_CATEGORY_VALUES]
SchemeId = Literal[*CORE_SCHEME_IDS]
PredictionLabel = Literal["eligible", "not_eligible"]

API_DISCLAIMER = (
    "This is an AI research prototype prediction based on synthetic data and "
    "documented scheme rules. It is not government approval or a final "
    "eligibility determination."
)


class CitizenProfile(BaseModel):
    """Citizen features shared by /predict and /recommend. No scheme_id."""

    age: int = Field(..., ge=AGE_MIN, le=AGE_MAX, description="Completed years, 0-120.")
    gender: Gender
    is_student: bool
    first_higher_education_course: bool
    school_background: SchoolBackground
    marital_status: MaritalStatus
    is_orphan: bool
    is_destitute: bool
    occupation_category: OccupationCategory
    wet_land_acres: float = Field(..., ge=LAND_MIN, description="Wet land in acres; must be >= 0.")
    dry_land_acres: float = Field(..., ge=LAND_MIN, description="Dry land in acres; must be >= 0.")

    def to_citizen_features(self) -> dict:
        """Feature dict expected by the saved pipeline. No eligibility_reason."""
        return {
            "age": int(self.age),
            "gender": self.gender,
            "is_student": bool(self.is_student),
            "first_higher_education_course": bool(self.first_higher_education_course),
            "school_background": self.school_background,
            "marital_status": self.marital_status,
            "is_orphan": bool(self.is_orphan),
            "is_destitute": bool(self.is_destitute),
            "occupation_category": self.occupation_category,
            "wet_land_acres": float(self.wet_land_acres),
            "dry_land_acres": float(self.dry_land_acres),
        }


class PredictionRequest(CitizenProfile):
    """Citizen profile plus the CORE scheme to score."""

    scheme_id: SchemeId

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "age": 19,
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
                "scheme_id": "TN-SW-001",
            }
        }
    )


class RuleResultPayload(BaseModel):
    eligible: bool
    reasons: list[str]
    rule_status: str | None = None
    verification_notes: str | None = None


class PredictionResponse(BaseModel):
    scheme_id: SchemeId
    prediction: PredictionLabel
    eligible_probability: float = Field(..., ge=0.0, le=1.0)
    not_eligible_probability: float = Field(..., ge=0.0, le=1.0)
    explanation: str
    model_name: str
    disclaimer: str
    rule_result: RuleResultPayload
    rule_reasons: list[str]
    ml_prediction: PredictionLabel
    agreement: bool

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "scheme_id": "TN-SW-001",
                "prediction": "eligible",
                "eligible_probability": 0.98,
                "not_eligible_probability": 0.02,
                "explanation": (
                    "Documented scheme conditions satisfied: female; student. "
                    "Decision Tree prediction: Eligible (model probability: 1.00) "
                    "Rule and ML prediction agree."
                ),
                "model_name": "Decision Tree",
                "disclaimer": API_DISCLAIMER,
                "rule_result": {
                    "eligible": True,
                    "reasons": ["female", "student"],
                    "rule_status": "documented",
                    "verification_notes": None,
                },
                "rule_reasons": ["female", "student"],
                "ml_prediction": "eligible",
                "agreement": True,
            }
        }
    )


class ModelInfoResponse(BaseModel):
    model_name: str
    supported_scheme_count: int
    supported_scheme_ids: list[SchemeId]
    model_artifact: str
    model_version: str
