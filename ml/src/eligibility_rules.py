"""Deterministic CORE-scheme eligibility rules.

Labels are derived only from documented official conditions and the
Phase 2.1 labeling convention. No model is trained here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

CORE_SCHEME_IDS = (
    "TN-SW-001",
    "TN-SW-002",
    "TN-SW-004",
    "TN-SW-006",
    "TN-REV-001",
    "TN-REV-002",
)

UPT_OCCUPATIONS = frozenset(
    {
        "small_marginal_farmer",
        "agricultural_labourer",
        "inland_fishing",
        "plantation_labourer",
    }
)

TAMIL_PUDHALVAN_SCHOOLS = frozenset(
    {
        "government_6_to_12",
        "government_or_aided_tamil_medium_6_to_12",
    }
)

MARRIAGE_ASSISTANCE_MIN_AGE = 18
UPT_AGE_MIN = 18
UPT_AGE_MAX = 65
UPT_WET_LAND_MAX = 2.50
UPT_DRY_LAND_MAX = 5.00
UNMARRIED_PENSION_MIN_AGE = 50


@dataclass(frozen=True)
class EligibilityResult:
    eligible: bool
    reason: str

    @property
    def label(self) -> int:
        return 1 if self.eligible else 0


def _as_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    text = str(value).strip().lower()
    if text in {"true", "1", "yes"}:
        return True
    if text in {"false", "0", "no"}:
        return False
    raise ValueError(f"Invalid boolean value: {value!r}")


def _as_int(value: Any) -> int:
    return int(value)


def _as_float(value: Any) -> float:
    return float(value)


def _format_result(passed: list[str], failed: list[str]) -> EligibilityResult:
    if failed:
        return EligibilityResult(False, "Not eligible: " + "; ".join(failed) + ".")
    return EligibilityResult(True, "Eligible: " + "; ".join(passed) + ".")


def is_eligible_pudhumai_penn(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-SW-001: female student in first higher-education course from a Government school 6-12."""
    passed: list[str] = []
    failed: list[str] = []

    if citizen["gender"] == "female":
        passed.append("female")
    else:
        failed.append("gender must be female")

    if _as_bool(citizen["is_student"]):
        passed.append("student")
    else:
        failed.append("must be a student")

    if _as_bool(citizen["first_higher_education_course"]):
        passed.append("first higher education course")
    else:
        failed.append("must be the first higher education course")

    if citizen["school_background"] == "government_6_to_12":
        passed.append("government-school background")
    else:
        failed.append("required school background condition is not satisfied")

    return _format_result(passed, failed)


def is_eligible_tamil_pudhalvan(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-SW-002: male student in first higher-education course from an official school path.

    Official page includes Government schools and Government-aided Tamil-medium schools.
    Both encoded school values that represent those paths are accepted. `other` is not.
    """
    passed: list[str] = []
    failed: list[str] = []

    if citizen["gender"] == "male":
        passed.append("male")
    else:
        failed.append("gender must be male")

    if _as_bool(citizen["is_student"]):
        passed.append("student")
    else:
        failed.append("must be a student")

    if _as_bool(citizen["first_higher_education_course"]):
        passed.append("first higher education course")
    else:
        failed.append("must be the first higher education course")

    if citizen["school_background"] in TAMIL_PUDHALVAN_SCHOOLS:
        passed.append("government or government-aided Tamil-medium school background")
    else:
        failed.append("required school background condition is not satisfied")

    return _format_result(passed, failed)


def is_eligible_dharmambal(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-SW-004: female widow remarrying, age 18 or above.

    Age 18 follows the documented Social Welfare Department marriage-assistance convention.
    """
    passed: list[str] = []
    failed: list[str] = []
    age = _as_int(citizen["age"])

    if citizen["gender"] == "female":
        passed.append("female")
    else:
        failed.append("gender must be female")

    if citizen["marital_status"] == "widow_remarrying":
        passed.append("widow remarrying")
    else:
        failed.append("must be a widow remarrying")

    if age >= MARRIAGE_ASSISTANCE_MIN_AGE:
        passed.append(f"age {age} is 18 or above")
    else:
        failed.append("age must be 18 or above")

    return _format_result(passed, failed)


def is_eligible_annai_therasa(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-SW-006: female orphan, age 18 or above.

    Marital status is not an extra invented test. The documented CORE rule uses
    gender, orphan status, and the marriage-assistance age convention only.
    """
    passed: list[str] = []
    failed: list[str] = []
    age = _as_int(citizen["age"])

    if citizen["gender"] == "female":
        passed.append("female")
    else:
        failed.append("gender must be female")

    if _as_bool(citizen["is_orphan"]):
        passed.append("orphan")
    else:
        failed.append("must be an orphan")

    if age >= MARRIAGE_ASSISTANCE_MIN_AGE:
        passed.append(f"age {age} is 18 or above")
    else:
        failed.append("age must be 18 or above")

    return _format_result(passed, failed)


def is_eligible_uzhavar_pathukappu(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-REV-001: age 18-65, listed farm occupation, and official land wording.

    Land test: wet_land_acres <= 2.50 OR dry_land_acres <= 5.00, as documented
    in Phase 2.1 from the official 'wet ... or dry ...' wording.
    """
    passed: list[str] = []
    failed: list[str] = []
    age = _as_int(citizen["age"])
    occupation = citizen["occupation_category"]
    wet = _as_float(citizen["wet_land_acres"])
    dry = _as_float(citizen["dry_land_acres"])

    if UPT_AGE_MIN <= age <= UPT_AGE_MAX:
        passed.append(f"age {age} is within 18-65")
    else:
        failed.append("age must be between 18 and 65")

    if occupation in UPT_OCCUPATIONS:
        passed.append(f"occupation {occupation}")
    else:
        failed.append("occupation is not an official main-member group")

    if wet <= UPT_WET_LAND_MAX or dry <= UPT_DRY_LAND_MAX:
        passed.append(
            f"land within official wording (wet {wet:.2f} <= 2.50 or dry {dry:.2f} <= 5.00)"
        )
    else:
        failed.append("land exceeds both the wet 2.50 acre and dry 5.00 acre limits")

    return _format_result(passed, failed)


def is_eligible_unmarried_women_pension(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-REV-002: female, never married, age 50 or above, destitute."""
    passed: list[str] = []
    failed: list[str] = []
    age = _as_int(citizen["age"])

    if citizen["gender"] == "female":
        passed.append("female")
    else:
        failed.append("gender must be female")

    if citizen["marital_status"] == "never_married":
        passed.append("never married")
    else:
        failed.append("must be never married")

    if age >= UNMARRIED_PENSION_MIN_AGE:
        passed.append(f"age {age} is 50 or above")
    else:
        failed.append("age must be 50 or above")

    if _as_bool(citizen["is_destitute"]):
        passed.append("destitute")
    else:
        failed.append("must be destitute")

    return _format_result(passed, failed)


RULE_FUNCTIONS = {
    "TN-SW-001": is_eligible_pudhumai_penn,
    "TN-SW-002": is_eligible_tamil_pudhalvan,
    "TN-SW-004": is_eligible_dharmambal,
    "TN-SW-006": is_eligible_annai_therasa,
    "TN-REV-001": is_eligible_uzhavar_pathukappu,
    "TN-REV-002": is_eligible_unmarried_women_pension,
}


def evaluate_scheme(scheme_id: str, citizen: dict[str, Any]) -> EligibilityResult:
    try:
        rule = RULE_FUNCTIONS[scheme_id]
    except KeyError as exc:
        raise ValueError(f"Scheme {scheme_id} is not in the CORE labeling set") from exc
    return rule(citizen)
