"""Pydantic models for recommendation history."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.prediction import CitizenProfile


class HistorySchemeRef(BaseModel):
    scheme_id: str
    scheme_name: str


class RecommendationHistoryItem(BaseModel):
    id: str
    checked_at: datetime
    profile_snapshot: CitizenProfile
    recommended_scheme_ids: list[str]
    recommendation_count: int
    recommended_schemes: list[HistorySchemeRef]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                "checked_at": "2026-08-17T10:00:00+00:00",
                "profile_snapshot": {
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
                },
                "recommended_scheme_ids": ["TN-SW-001"],
                "recommendation_count": 1,
                "recommended_schemes": [
                    {
                        "scheme_id": "TN-SW-001",
                        "scheme_name": (
                            "Moovalur Ramamirtham Ammaiyar Ninaivu Pudhumai Penn Thittam"
                        ),
                    }
                ],
            }
        }
    )


class RecommendationHistoryListResponse(BaseModel):
    count: int = Field(..., ge=0)
    history: list[RecommendationHistoryItem]
