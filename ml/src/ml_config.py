"""Shared Phase 4 ML constants. Does not train a model by itself."""

from __future__ import annotations

from pathlib import Path

SEED = 20260814
TEST_SIZE = 0.20

TARGET_COLUMN = "eligible"
ID_COLUMN = "citizen_id"
LEAKAGE_COLUMNS = ("citizen_id", "eligibility_reason", "eligible")

NUMERIC_FEATURES = [
    "age",
    "wet_land_acres",
    "dry_land_acres",
]

CATEGORICAL_FEATURES = [
    "scheme_id",
    "gender",
    "is_student",
    "first_higher_education_course",
    "school_background",
    "marital_status",
    "is_orphan",
    "is_destitute",
    "occupation_category",
]

FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES
FEATURE_COLUMNS_NO_SCHEME = [column for column in FEATURE_COLUMNS if column != "scheme_id"]
CATEGORICAL_FEATURES_NO_SCHEME = [column for column in CATEGORICAL_FEATURES if column != "scheme_id"]

# Allowed values from docs/citizen_feature_specification.md. The API imports
# these tuples so it does not keep a second conflicting feature vocabulary.
CORE_SCHEME_IDS = (
    "TN-SW-001",
    "TN-SW-002",
    "TN-SW-004",
    "TN-SW-006",
    "TN-REV-001",
    "TN-REV-002",
)

GENDER_VALUES = ("female", "male", "transgender")
SCHOOL_BACKGROUND_VALUES = (
    "government_6_to_12",
    "government_or_aided_tamil_medium_6_to_12",
    "other",
)
MARITAL_STATUS_VALUES = ("never_married", "married", "widow", "widow_remarrying")
OCCUPATION_CATEGORY_VALUES = (
    "small_marginal_farmer",
    "agricultural_labourer",
    "inland_fishing",
    "plantation_labourer",
    "other",
)

AGE_MIN = 0
AGE_MAX = 120
LAND_MIN = 0.0


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def dataset_path() -> Path:
    return repo_root() / "dataset" / "processed" / "eligibility_dataset.csv"
