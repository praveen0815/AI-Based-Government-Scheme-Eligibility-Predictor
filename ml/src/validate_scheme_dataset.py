"""Validate dataset/raw/schemes.csv.

This script checks catalog structure and basic data quality.
It does not train a model and does not create citizen records.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

REQUIRED_COLUMNS = [
    "scheme_id",
    "scheme_name",
    "department",
    "scheme_category",
    "description",
    "age_min",
    "age_max",
    "gender_requirement",
    "annual_income_limit",
    "occupation_requirement",
    "education_requirement",
    "student_status_requirement",
    "marital_status_requirement",
    "widow_status_requirement",
    "disability_requirement",
    "disability_percentage_min",
    "bpl_requirement",
    "destitute_requirement",
    "land_requirement",
    "asset_limit",
    "family_condition",
    "school_type_requirement",
    "district_requirement",
    "benefit_description",
    "required_documents",
    "application_method",
    "official_source_url",
    "source_access_date",
    "eligibility_notes",
    "ml_scope",
    "eligibility_rule_status",
]

ML_SCOPE_VALUES = {"CORE", "ADVANCED", "HOLD"}
ELIGIBILITY_RULE_STATUS_VALUES = {"VERIFIED", "PARTIALLY_VERIFIED", "UNRESOLVED"}

NUMERIC_COLUMNS = [
    "age_min",
    "age_max",
    "annual_income_limit",
    "disability_percentage_min",
]

TEXT_REQUIRED_NONEMPTY = [
    "scheme_id",
    "scheme_name",
    "official_source_url",
    "ml_scope",
    "eligibility_rule_status",
]


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def is_blank(value: object) -> bool:
    if value is None or pd.isna(value):
        return True
    return str(value).strip() == ""


def is_numeric(value: object) -> bool:
    try:
        float(str(value).strip())
    except (TypeError, ValueError):
        return False
    return True


def validate(csv_path: Path) -> int:
    errors: list[str] = []
    warnings: list[str] = []

    if not csv_path.is_file():
        print(f"ERROR: file not found: {csv_path}")
        return 1

    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)

    missing_columns = [column for column in REQUIRED_COLUMNS if column not in df.columns]
    extra_columns = [column for column in df.columns if column not in REQUIRED_COLUMNS]
    if missing_columns:
        errors.append(f"Missing required columns: {missing_columns}")
    if extra_columns:
        warnings.append(f"Unexpected extra columns: {extra_columns}")

    if missing_columns:
        _print_report(df, errors, warnings)
        return 1

    if df.empty:
        errors.append("Dataset has no scheme rows.")

    for column in TEXT_REQUIRED_NONEMPTY:
        blank_rows = [
            index + 2
            for index, value in enumerate(df[column])
            if is_blank(value)
        ]
        if blank_rows:
            errors.append(f"{column} is empty on CSV rows: {blank_rows}")

    duplicate_ids = df.loc[df["scheme_id"].duplicated(keep=False), "scheme_id"]
    if not duplicate_ids.empty:
        errors.append(f"Duplicate scheme_id values: {sorted(set(duplicate_ids))}")

    name_source = df[["scheme_name", "official_source_url"]].apply(
        lambda row: (row["scheme_name"].strip().lower(), row["official_source_url"].strip().lower()),
        axis=1,
    )
    duplicate_records = name_source[name_source.duplicated(keep=False)]
    if not duplicate_records.empty:
        errors.append("Duplicate scheme records found (same scheme_name + official_source_url).")

    for column in NUMERIC_COLUMNS:
        invalid_rows = [
            index + 2
            for index, value in enumerate(df[column])
            if not is_blank(value) and not is_numeric(value)
        ]
        if invalid_rows:
            errors.append(
                f"{column} has non-numeric values on CSV rows: {invalid_rows}. "
                "Leave the cell empty and record NEEDS VERIFICATION in eligibility_notes."
            )

    for index, url in enumerate(df["official_source_url"]):
        if is_blank(url):
            continue
        if not str(url).strip().lower().startswith(("http://", "https://")):
            errors.append(f"official_source_url is not an HTTP URL on CSV row {index + 2}")

    invalid_scope = [
        index + 2
        for index, value in enumerate(df["ml_scope"])
        if str(value).strip() not in ML_SCOPE_VALUES
    ]
    if invalid_scope:
        errors.append(
            f"ml_scope must be one of {sorted(ML_SCOPE_VALUES)} on CSV rows: {invalid_scope}"
        )

    invalid_status = [
        index + 2
        for index, value in enumerate(df["eligibility_rule_status"])
        if str(value).strip() not in ELIGIBILITY_RULE_STATUS_VALUES
    ]
    if invalid_status:
        errors.append(
            "eligibility_rule_status must be one of "
            f"{sorted(ELIGIBILITY_RULE_STATUS_VALUES)} on CSV rows: {invalid_status}"
        )

    needs_verification = 0
    for column in df.columns:
        needs_verification += int(
            df[column].astype(str).str.contains("NEEDS VERIFICATION", case=False, regex=False).sum()
        )
    if needs_verification:
        warnings.append(f"Cells containing NEEDS VERIFICATION: {needs_verification}")

    _print_report(df, errors, warnings)
    return 1 if errors else 0


def _print_report(df: pd.DataFrame, errors: list[str], warnings: list[str]) -> None:
    print(f"Rows: {len(df)}")
    print(f"Columns: {len(df.columns)}")
    print(f"Errors: {len(errors)}")
    print(f"Warnings: {len(warnings)}")
    for item in errors:
        print(f"ERROR: {item}")
    for item in warnings:
        print(f"WARNING: {item}")
    if not errors:
        print("Validation passed.")


def main() -> int:
    csv_path = repo_root() / "dataset" / "raw" / "schemes.csv"
    if len(sys.argv) > 1:
        csv_path = Path(sys.argv[1])
    return validate(csv_path)


if __name__ == "__main__":
    raise SystemExit(main())
