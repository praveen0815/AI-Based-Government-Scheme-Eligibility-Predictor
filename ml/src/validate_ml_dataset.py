"""Validate synthetic citizen and eligibility datasets.

This script does not train a model.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from eligibility_rules import CORE_SCHEME_IDS

CITIZEN_COLUMNS = [
    "citizen_id",
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
]

GENDERS = {"female", "male", "transgender"}
SCHOOLS = {
    "government_6_to_12",
    "government_or_aided_tamil_medium_6_to_12",
    "other",
}
MARITAL = {"never_married", "married", "widow", "widow_remarrying"}
OCCUPATIONS = {
    "small_marginal_farmer",
    "agricultural_labourer",
    "inland_fishing",
    "plantation_labourer",
    "other",
}
BOOLEANS = {"true", "false"}
EXPECTED_CITIZENS = 5000
EXPECTED_ELIGIBILITY_ROWS = 30000


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def is_blank(value: object) -> bool:
    if value is None or pd.isna(value):
        return True
    return str(value).strip() == ""


def validate_citizens(path: Path, errors: list[str], warnings: list[str]) -> pd.DataFrame | None:
    if not path.is_file():
        errors.append(f"Missing file: {path}")
        return None

    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    missing = [column for column in CITIZEN_COLUMNS if column not in df.columns]
    extra = [column for column in df.columns if column not in CITIZEN_COLUMNS]
    if missing:
        errors.append(f"citizens.csv missing columns: {missing}")
    if extra:
        errors.append(f"citizens.csv unexpected columns: {extra}")
    if missing:
        return df

    if df["citizen_id"].duplicated().any():
        errors.append("citizens.csv has duplicate citizen_id values")
    if df["citizen_id"].map(is_blank).any():
        errors.append("citizens.csv has empty citizen_id values")

    for index, age_text in enumerate(df["age"]):
        try:
            age = int(age_text)
        except ValueError:
            errors.append(f"citizens.csv invalid age on CSV row {index + 2}")
            continue
        if age < 0 or age > 120:
            errors.append(f"citizens.csv age out of range 0-120 on CSV row {index + 2}")

    invalid_gender = ~df["gender"].isin(GENDERS)
    if invalid_gender.any():
        errors.append("citizens.csv has invalid gender values")

    for column in ("is_student", "first_higher_education_course", "is_orphan", "is_destitute"):
        if ~df[column].isin(BOOLEANS).all():
            errors.append(f"citizens.csv has invalid boolean values in {column}")

    if ~df["school_background"].isin(SCHOOLS).all():
        errors.append("citizens.csv has invalid school_background values")
    if ~df["marital_status"].isin(MARITAL).all():
        errors.append("citizens.csv has invalid marital_status values")
    if ~df["occupation_category"].isin(OCCUPATIONS).all():
        errors.append("citizens.csv has invalid occupation_category values")

    for column in ("wet_land_acres", "dry_land_acres"):
        for index, text in enumerate(df[column]):
            try:
                value = float(text)
            except ValueError:
                errors.append(f"citizens.csv invalid {column} on CSV row {index + 2}")
                continue
            if value < 0:
                errors.append(f"citizens.csv negative {column} on CSV row {index + 2}")

    if len(df) != EXPECTED_CITIZENS:
        warnings.append(f"citizens.csv has {len(df)} rows; expected about {EXPECTED_CITIZENS}")

    return df


def validate_eligibility(
    path: Path,
    citizens: pd.DataFrame | None,
    errors: list[str],
    warnings: list[str],
) -> pd.DataFrame | None:
    if not path.is_file():
        errors.append(f"Missing file: {path}")
        return None

    expected_columns = [
        "citizen_id",
        "scheme_id",
        *CITIZEN_COLUMNS[1:],
        "eligible",
        "eligibility_reason",
    ]
    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    missing = [column for column in expected_columns if column not in df.columns]
    extra = [column for column in df.columns if column not in expected_columns]
    if missing:
        errors.append(f"eligibility_dataset.csv missing columns: {missing}")
    if extra:
        errors.append(f"eligibility_dataset.csv unexpected columns: {extra}")
    if missing:
        return df

    if citizens is not None:
        unknown = set(df["citizen_id"]) - set(citizens["citizen_id"])
        if unknown:
            errors.append("eligibility_dataset.csv has citizen_id values not in citizens.csv")

    if ~df["scheme_id"].isin(CORE_SCHEME_IDS).all():
        errors.append("eligibility_dataset.csv contains a non-CORE scheme_id")
    present_schemes = set(df["scheme_id"])
    missing_schemes = set(CORE_SCHEME_IDS) - present_schemes
    if missing_schemes:
        errors.append(f"eligibility_dataset.csv missing CORE schemes: {sorted(missing_schemes)}")

    if ~df["eligible"].isin({"0", "1"}).all():
        errors.append("eligibility_dataset.csv eligible must be only 0 or 1")

    if df["eligibility_reason"].map(is_blank).any():
        errors.append("eligibility_dataset.csv has empty eligibility_reason values")

    duplicated = df.duplicated(subset=["citizen_id", "scheme_id"], keep=False)
    if duplicated.any():
        errors.append("eligibility_dataset.csv has duplicate citizen_id + scheme_id rows")

    if len(df) != EXPECTED_ELIGIBILITY_ROWS:
        warnings.append(
            f"eligibility_dataset.csv has {len(df)} rows; expected about {EXPECTED_ELIGIBILITY_ROWS}"
        )

    return df


def main() -> int:
    root = repo_root()
    errors: list[str] = []
    warnings: list[str] = []
    citizens = validate_citizens(root / "dataset" / "raw" / "citizens.csv", errors, warnings)
    eligibility = validate_eligibility(
        root / "dataset" / "processed" / "eligibility_dataset.csv",
        citizens,
        errors,
        warnings,
    )

    print(f"Citizen rows: {0 if citizens is None else len(citizens)}")
    print(f"Eligibility rows: {0 if eligibility is None else len(eligibility)}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    for item in errors:
        print(f"ERROR: {item}")
    for item in warnings:
        print(f"WARNING: {item}")
    if not errors:
        print("Validation passed.")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
