"""Inspect dataset/processed/eligibility_dataset.csv without modifying it."""

from __future__ import annotations

import sys
from pathlib import Path

import pandas as pd

SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from ml_config import dataset_path, repo_root


def inspect(df: pd.DataFrame) -> str:
    lines = [
        "# Dataset inspection",
        "",
        "Phase 4 read-only inspection of `dataset/processed/eligibility_dataset.csv`.",
        "The source file was not modified.",
        "",
        "## Shape",
        "",
        f"- Rows: {len(df)}",
        f"- Columns: {len(df.columns)}",
        "",
        "## Columns and dtypes (as loaded)",
        "",
        "| Column | dtype | Non-null | Missing |",
        "| --- | --- | ---: | ---: |",
    ]
    for column in df.columns:
        missing = int(df[column].isna().sum())
        lines.append(
            f"| `{column}` | {df[column].dtype} | {len(df) - missing} | {missing} |"
        )

    duplicate_rows = int(df.duplicated().sum())
    lines.extend(
        [
            "",
            "## Duplicates and missing values",
            "",
            f"- Missing cells: {int(df.isna().sum().sum())}",
            f"- Duplicate rows: {duplicate_rows}",
            f"- Duplicate citizen_id + scheme_id: {int(df.duplicated(subset=['citizen_id', 'scheme_id']).sum())}",
            "",
            "## Target distribution",
            "",
        ]
    )
    target = df["eligible"].astype(int)
    lines.append(f"- eligible=1: {(target == 1).sum()} ({target.mean():.2%})")
    lines.append(f"- eligible=0: {(target == 0).sum()} ({1 - target.mean():.2%})")
    lines.extend(
        [
            "",
            "## Target distribution by scheme",
            "",
            "| scheme_id | Rows | Eligible | Eligible % |",
            "| --- | ---: | ---: | ---: |",
        ]
    )
    for scheme_id, group in df.groupby("scheme_id"):
        yes = int(group["eligible"].astype(int).sum())
        lines.append(f"| {scheme_id} | {len(group)} | {yes} | {yes / len(group):.2%} |")

    categorical_like = [
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
    lines.extend(["", "## Categorical cardinality", "", "| Column | Unique values | Values |", "| --- | ---: | --- |"])
    for column in categorical_like:
        values = sorted(df[column].astype(str).unique())
        lines.append(f"| `{column}` | {len(values)} | {', '.join(values)} |")

    numeric_like = ["age", "wet_land_acres", "dry_land_acres"]
    lines.extend(
        [
            "",
            "## Numeric ranges",
            "",
            "| Column | Min | Max | Mean |",
            "| --- | ---: | ---: | ---: |",
        ]
    )
    for column in numeric_like:
        series = pd.to_numeric(df[column], errors="coerce")
        lines.append(
            f"| `{column}` | {series.min():.2f} | {series.max():.2f} | {series.mean():.2f} |"
        )
    lines.append("")
    return "\n".join(lines)


def main() -> int:
    path = dataset_path()
    df = pd.read_csv(path)
    report = inspect(df)
    out_path = repo_root() / "docs" / "dataset_inspection.md"
    out_path.write_text(report, encoding="utf-8")
    print(report)
    print(f"Wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
