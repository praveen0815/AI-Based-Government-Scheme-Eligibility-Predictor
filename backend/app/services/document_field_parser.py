"""Map OCR text onto existing wallet fields. Does not invent undocumented attributes."""

from __future__ import annotations

import re
from datetime import date, datetime, timezone
from typing import Any

from app.paths import ensure_ml_src_on_path

ensure_ml_src_on_path()

from ml_config import AGE_MAX, AGE_MIN, SCHOOL_BACKGROUND_VALUES  # noqa: E402

from app.schemas.document_scanner import EDUCATION_WALLET_FIELDS, FieldClarity
from app.services.ocr_service import LOW_OCR_CONFIDENCE

_DOB_LABEL = re.compile(
    r"(?:date\s+of\s+birth|d\.?o\.?b\.?|dob)\s*[:\-]?\s*"
    r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})",
    re.IGNORECASE,
)
_AGE_LABEL = re.compile(r"\bage\s*[:\-]?\s*(\d{1,3})\b", re.IGNORECASE)


def parse_education_certificate(
    text: str,
    *,
    mean_confidence: float | None = None,
    today: date | None = None,
) -> tuple[dict[str, Any], dict[str, FieldClarity]]:
    """Extract only education-related CORE wallet fields from untrusted OCR text."""
    values: dict[str, Any] = {
        "age": None,
        "is_student": None,
        "first_higher_education_course": None,
        "school_background": None,
    }
    clarity: dict[str, FieldClarity] = {name: "missing" for name in EDUCATION_WALLET_FIELDS}
    blob = " ".join((text or "").split())
    if not blob.strip():
        return values, clarity

    lowered = blob.lower()
    age, age_clarity = _extract_age(blob, today or datetime.now(timezone.utc).date())
    values["age"] = age
    clarity["age"] = age_clarity

    student, student_clarity = _extract_student(lowered)
    values["is_student"] = student
    clarity["is_student"] = student_clarity

    first_course, first_clarity = _extract_first_course(lowered)
    values["first_higher_education_course"] = first_course
    clarity["first_higher_education_course"] = first_clarity

    school, school_clarity = _extract_school_background(lowered)
    values["school_background"] = school
    clarity["school_background"] = school_clarity

    if mean_confidence is not None and mean_confidence < LOW_OCR_CONFIDENCE:
        for name, level in list(clarity.items()):
            if level == "extracted":
                clarity[name] = "unclear"
    return values, clarity


def coerce_confirmed_education_fields(fields: dict[str, Any]) -> dict[str, Any]:
    """Validate citizen-edited values against the existing wallet vocabulary."""
    confirmed: dict[str, Any] = {}
    unknown = [name for name in fields if name not in EDUCATION_WALLET_FIELDS]
    if unknown:
        raise ValueError("Only education-related wallet fields can be confirmed from this document.")
    if "age" in fields:
        confirmed["age"] = _coerce_age(fields["age"])
    if "is_student" in fields:
        confirmed["is_student"] = _coerce_bool(fields["is_student"], "is_student")
    if "first_higher_education_course" in fields:
        confirmed["first_higher_education_course"] = _coerce_bool(
            fields["first_higher_education_course"],
            "first_higher_education_course",
        )
    if "school_background" in fields:
        school = str(fields["school_background"] or "").strip()
        if school not in SCHOOL_BACKGROUND_VALUES:
            raise ValueError("Choose a documented school background value.")
        confirmed["school_background"] = school
    return confirmed


def _extract_age(text: str, today: date) -> tuple[int | None, FieldClarity]:
    match = _DOB_LABEL.search(text)
    if match:
        parsed = _parse_date(match.group(1))
        if parsed is not None:
            age = today.year - parsed.year - ((today.month, today.day) < (parsed.month, parsed.day))
            if AGE_MIN <= age <= AGE_MAX:
                return age, "extracted"
            return None, "unclear"
        return None, "unclear"
    age_match = _AGE_LABEL.search(text)
    if age_match:
        age = int(age_match.group(1))
        if AGE_MIN <= age <= AGE_MAX:
            return age, "extracted"
        return None, "unclear"
    return None, "missing"


def _extract_student(lowered: str) -> tuple[bool | None, FieldClarity]:
    if re.search(r"\b(alumnus|alumna|passed\s+out|completed\s+(?:the\s+)?course)\b", lowered):
        return False, "unclear"
    if re.search(r"\b(studying|currently\s+a\s+student|pursuing|enrolled)\b", lowered):
        return True, "extracted"
    if re.search(r"\b(student|mark\s*sheet|marksheet|grade\s*sheet|class\s+\d+|standard\s+\d+|semester)\b", lowered):
        return True, "unclear"
    return None, "missing"


def _extract_first_course(lowered: str) -> tuple[bool | None, FieldClarity]:
    if re.search(r"\b(second\s+degree|already\s+(?:a\s+)?graduate|post\s*graduate|pg\s+course)\b", lowered):
        return False, "extracted"
    if re.search(r"\b(first\s+year|1st\s+year|i\s+year|first\s+higher|undergraduate\s+first)\b", lowered):
        return True, "extracted"
    if re.search(r"\b(first\s+course|ug\s+first)\b", lowered):
        return True, "unclear"
    return None, "missing"


def _extract_school_background(lowered: str) -> tuple[str | None, FieldClarity]:
    tamil_medium = "tamil medium" in lowered or "tamil-medium" in lowered
    government = bool(re.search(r"\b(government|govt\.?)\b", lowered))
    aided = bool(re.search(r"\b(aided|govt(?:ernment)?[\s-]*aided)\b", lowered))
    if tamil_medium and (government or aided):
        return "government_or_aided_tamil_medium_6_to_12", "extracted"
    if government and re.search(r"\b(school|higher\s+secondary|class(?:es)?\s+6|std\.?\s*6)\b", lowered):
        return "government_6_to_12", "extracted"
    if government:
        return "government_6_to_12", "unclear"
    if re.search(r"\b(matriculation|cbse|icse|private\s+school|international\s+school)\b", lowered):
        return "other", "extracted"
    if re.search(r"\b(school|mark\s*sheet|marksheet|higher\s+secondary)\b", lowered):
        return "other", "unclear"
    return None, "missing"


def _parse_date(raw: str) -> date | None:
    value = raw.strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%Y/%m/%d", "%d/%m/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _coerce_age(value: Any) -> int:
    try:
        age = int(value)
    except (TypeError, ValueError) as exc:
        raise ValueError("Age must be a whole number between 0 and 120.") from exc
    if age < AGE_MIN or age > AGE_MAX:
        raise ValueError("Age must be a whole number between 0 and 120.")
    return age


def _coerce_bool(value: Any, field_name: str) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "yes", "1"}:
            return True
        if lowered in {"false", "no", "0"}:
            return False
    raise ValueError(f"{field_name} must be true or false.")
