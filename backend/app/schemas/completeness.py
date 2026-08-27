"""Pydantic models for socio-economic profile completeness."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ProfileCompletenessResponse(BaseModel):
    percentage: int = Field(..., ge=0, le=100)
    completed_fields: int = Field(..., ge=0)
    total_fields: int = Field(..., ge=0)
    incomplete_fields: list[str]

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "percentage": 100,
                "completed_fields": 11,
                "total_fields": 11,
                "incomplete_fields": [],
            }
        }
    )
