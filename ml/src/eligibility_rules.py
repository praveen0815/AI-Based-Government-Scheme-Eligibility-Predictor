"""Deterministic CORE-scheme eligibility rules.

Labels are derived only from documented official conditions and the
Phase 2.1 labeling convention. No model is trained here.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ml_config import CORE_SCHEME_IDS  # noqa: F401

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
    checks: tuple[tuple[bool, str], ...] = ()
    """One (passed, text) entry per documented condition, in rule order."""

    @property
    def label(self) -> int:
        return 1 if self.eligible else 0


class _Checks:
    def __init__(self) -> None:
        self.passed: list[str] = []
        self.failed: list[str] = []
        self.ordered: list[tuple[bool, str]] = []

    def ok(self, text: str) -> None:
        self.passed.append(text)
        self.ordered.append((True, text))

    def fail(self, text: str) -> None:
        self.failed.append(text)
        self.ordered.append((False, text))

    def result(self) -> EligibilityResult:
        base = _format_result(self.passed, self.failed)
        return EligibilityResult(base.eligible, base.reason, tuple(self.ordered))


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
    checks = _Checks()

    if citizen["gender"] == "female":
        checks.ok("female")
    else:
        checks.fail("gender must be female")

    if _as_bool(citizen["is_student"]):
        checks.ok("student")
    else:
        checks.fail("must be a student")

    if _as_bool(citizen["first_higher_education_course"]):
        checks.ok("first higher education course")
    else:
        checks.fail("must be the first higher education course")

    if citizen["school_background"] == "government_6_to_12":
        checks.ok("government-school background")
    else:
        checks.fail("required school background condition is not satisfied")

    return checks.result()


def is_eligible_tamil_pudhalvan(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-SW-002: male student in first higher-education course from an official school path.

    Official page includes Government schools and Government-aided Tamil-medium schools.
    Both encoded school values that represent those paths are accepted. `other` is not.
    """
    checks = _Checks()

    if citizen["gender"] == "male":
        checks.ok("male")
    else:
        checks.fail("gender must be male")

    if _as_bool(citizen["is_student"]):
        checks.ok("student")
    else:
        checks.fail("must be a student")

    if _as_bool(citizen["first_higher_education_course"]):
        checks.ok("first higher education course")
    else:
        checks.fail("must be the first higher education course")

    if citizen["school_background"] in TAMIL_PUDHALVAN_SCHOOLS:
        checks.ok("government or government-aided Tamil-medium school background")
    else:
        checks.fail("required school background condition is not satisfied")

    return checks.result()


def is_eligible_dharmambal(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-SW-004: female widow remarrying, age 18 or above.

    Age 18 follows the documented Social Welfare Department marriage-assistance convention.
    """
    checks = _Checks()
    age = _as_int(citizen["age"])

    if citizen["gender"] == "female":
        checks.ok("female")
    else:
        checks.fail("gender must be female")

    if citizen["marital_status"] == "widow_remarrying":
        checks.ok("widow remarrying")
    else:
        checks.fail("must be a widow remarrying")

    if age >= MARRIAGE_ASSISTANCE_MIN_AGE:
        checks.ok(f"age {age} is 18 or above")
    else:
        checks.fail("age must be 18 or above")

    return checks.result()


def is_eligible_annai_therasa(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-SW-006: female orphan, age 18 or above.

    Marital status is not an extra invented test. The documented CORE rule uses
    gender, orphan status, and the marriage-assistance age convention only.
    """
    checks = _Checks()
    age = _as_int(citizen["age"])

    if citizen["gender"] == "female":
        checks.ok("female")
    else:
        checks.fail("gender must be female")

    if _as_bool(citizen["is_orphan"]):
        checks.ok("orphan")
    else:
        checks.fail("must be an orphan")

    if age >= MARRIAGE_ASSISTANCE_MIN_AGE:
        checks.ok(f"age {age} is 18 or above")
    else:
        checks.fail("age must be 18 or above")

    return checks.result()


def is_eligible_uzhavar_pathukappu(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-REV-001: age 18-65, listed farm occupation, and official land wording.

    Land test: wet_land_acres <= 2.50 OR dry_land_acres <= 5.00, as documented
    in Phase 2.1 from the official 'wet ... or dry ...' wording. This reading is
    pending confirmation against the official G.O.; reason text names the limit
    that was actually met so it never claims a value is within a limit it exceeds.
    """
    checks = _Checks()
    age = _as_int(citizen["age"])
    occupation = citizen["occupation_category"]
    wet = _as_float(citizen["wet_land_acres"])
    dry = _as_float(citizen["dry_land_acres"])

    if UPT_AGE_MIN <= age <= UPT_AGE_MAX:
        checks.ok(f"age {age} is within 18-65")
    else:
        checks.fail("age must be between 18 and 65")

    if occupation in UPT_OCCUPATIONS:
        checks.ok(f"occupation {occupation}")
    else:
        checks.fail("occupation is not an official main-member group")

    wet_within = wet <= UPT_WET_LAND_MAX
    dry_within = dry <= UPT_DRY_LAND_MAX
    if wet_within and dry_within:
        checks.ok(
            f"wet land {wet:.2f} acres is within 2.50 and dry land {dry:.2f} acres is within 5.00"
        )
    elif wet_within:
        checks.ok(
            f"wet land {wet:.2f} acres is within the 2.50 acre wet limit "
            f"(dry land {dry:.2f} acres exceeds 5.00, but the current rule accepts either limit)"
        )
    elif dry_within:
        checks.ok(
            f"dry land {dry:.2f} acres is within the 5.00 acre dry limit "
            f"(wet land {wet:.2f} acres exceeds 2.50, but the current rule accepts either limit)"
        )
    else:
        checks.fail("land exceeds both the wet 2.50 acre and dry 5.00 acre limits")

    return checks.result()


def is_eligible_unmarried_women_pension(citizen: dict[str, Any]) -> EligibilityResult:
    """TN-REV-002: female, never married, age 50 or above, destitute."""
    checks = _Checks()
    age = _as_int(citizen["age"])

    if citizen["gender"] == "female":
        checks.ok("female")
    else:
        checks.fail("gender must be female")

    if citizen["marital_status"] == "never_married":
        checks.ok("never married")
    else:
        checks.fail("must be never married")

    if age >= UNMARRIED_PENSION_MIN_AGE:
        checks.ok(f"age {age} is 50 or above")
    else:
        checks.fail("age must be 50 or above")

    if _as_bool(citizen["is_destitute"]):
        checks.ok("destitute")
    else:
        checks.fail("must be destitute")

    return checks.result()


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
