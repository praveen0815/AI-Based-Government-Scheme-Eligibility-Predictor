"""Measure how many wallet profile fields are present.

False booleans and numeric zeros count as completed. Only missing, null,
or empty values are incomplete. This is not an eligibility score.
"""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

from app.schemas.completeness import ProfileCompletenessResponse

PROFILE_COMPLETENESS_FIELDS: tuple[str, ...] = (
    "age",
    "gender",
    "is_student",
    "first_higher_education_course",
    "school_background",
    "marital_status",
    "is_orphan",
    "is_destitute",
    "occupation_category",
    "wet_land_acres",
    "dry_land_acres",
)


def is_field_completed(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str) and value.strip() == "":
        return False
    return True


def calculate_profile_completeness(profile: Mapping[str, Any] | Any) -> ProfileCompletenessResponse:
    values = profile if isinstance(profile, Mapping) else _profile_mapping(profile)
    incomplete = [
        field for field in PROFILE_COMPLETENESS_FIELDS if not is_field_completed(values.get(field))
    ]
    total_fields = len(PROFILE_COMPLETENESS_FIELDS)
    completed_fields = total_fields - len(incomplete)
    percentage = round((completed_fields / total_fields) * 100) if total_fields else 0
    return ProfileCompletenessResponse(
        percentage=percentage,
        completed_fields=completed_fields,
        total_fields=total_fields,
        incomplete_fields=incomplete,
    )


def _profile_mapping(profile: Any) -> dict[str, Any]:
    return {field: getattr(profile, field, None) for field in PROFILE_COMPLETENESS_FIELDS}
