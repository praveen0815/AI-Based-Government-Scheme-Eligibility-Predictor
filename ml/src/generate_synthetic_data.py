"""Generate reproducible synthetic citizens and CORE eligibility labels.

This script does not train a model and does not use real personal data.
"""

from __future__ import annotations

import csv
import sys
from collections import Counter
from pathlib import Path

import numpy as np

SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from eligibility_rules import CORE_SCHEME_IDS, UPT_OCCUPATIONS, evaluate_scheme

SEED = 20260814
N_CITIZENS = 5000

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

ELIGIBILITY_COLUMNS = [
    "citizen_id",
    "scheme_id",
    *CITIZEN_COLUMNS[1:],
    "eligible",
    "eligibility_reason",
]

PROFILE_COUNTS = {
    "pudhumai": 400,
    "pudhalvan": 400,
    "dharmambal": 250,
    "annai": 250,
    "upt": 600,
    "unmarried_pension": 300,
    "general": 2800,
}

GENDERS = ("female", "male", "transgender")
SCHOOLS = (
    "government_6_to_12",
    "government_or_aided_tamil_medium_6_to_12",
    "other",
)
MARITAL = ("never_married", "married", "widow", "widow_remarrying")
OCCUPATIONS = (
    "small_marginal_farmer",
    "agricultural_labourer",
    "inland_fishing",
    "plantation_labourer",
    "other",
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def _choice(rng: np.random.Generator, values: tuple[str, ...], probs: list[float]) -> str:
    return str(rng.choice(values, p=probs))


def _bool(value: bool) -> str:
    return "true" if value else "false"


def _land_pair(rng: np.random.Generator, occupation: str, within_limit: bool | None = None) -> tuple[float, float]:
    if occupation == "other":
        return 0.0, 0.0
    if occupation != "small_marginal_farmer":
        if rng.random() < 0.85:
            return 0.0, 0.0
        return round(float(rng.uniform(0.1, 1.0)), 2), round(float(rng.uniform(0.1, 1.5)), 2)
    if within_limit is None:
        within_limit = bool(rng.random() < 0.7)
    if within_limit:
        if rng.random() < 0.5:
            return round(float(rng.uniform(0.2, 2.50)), 2), round(float(rng.uniform(0.0, 8.0)), 2)
        return round(float(rng.uniform(0.0, 6.0)), 2), round(float(rng.uniform(0.2, 5.00)), 2)
    return round(float(rng.uniform(2.51, 8.0)), 2), round(float(rng.uniform(5.01, 12.0)), 2)


def _school_for_age(rng: np.random.Generator, age: int) -> str:
    if age < 16:
        return "other"
    return _choice(rng, SCHOOLS, [0.40, 0.25, 0.35])


def _marital_for_age(rng: np.random.Generator, age: int) -> str:
    if age < 18:
        return "never_married"
    if age <= 24:
        return _choice(rng, MARITAL, [0.82, 0.14, 0.02, 0.02])
    if age <= 49:
        return _choice(rng, MARITAL, [0.18, 0.68, 0.08, 0.06])
    return _choice(rng, MARITAL, [0.12, 0.48, 0.28, 0.12])


def _occupation_for_age(rng: np.random.Generator, age: int, is_student: bool) -> str:
    if age < 18 or is_student:
        return "other"
    if age > 75:
        return _choice(rng, OCCUPATIONS, [0.08, 0.10, 0.04, 0.03, 0.75])
    return _choice(rng, OCCUPATIONS, [0.22, 0.18, 0.08, 0.07, 0.45])


def generate_general(rng: np.random.Generator) -> dict[str, object]:
    bucket = _choice(rng, ("child", "youth", "adult", "older", "elderly"), [0.12, 0.22, 0.36, 0.20, 0.10])
    if bucket == "child":
        age = int(rng.integers(0, 18))
    elif bucket == "youth":
        age = int(rng.integers(18, 26))
    elif bucket == "adult":
        age = int(rng.integers(26, 50))
    elif bucket == "older":
        age = int(rng.integers(50, 66))
    else:
        age = int(rng.integers(66, 91))

    gender = _choice(rng, GENDERS, [0.48, 0.48, 0.04])

    if age < 16:
        is_student = bool(rng.random() < 0.90)
        first_higher = False
    elif age <= 17:
        is_student = bool(rng.random() < 0.80)
        first_higher = False
    elif age <= 25:
        is_student = bool(rng.random() < 0.45)
        first_higher = bool(is_student and rng.random() < 0.70)
    elif age <= 35:
        is_student = bool(rng.random() < 0.08)
        first_higher = bool(is_student and rng.random() < 0.40)
    else:
        is_student = bool(rng.random() < 0.02)
        first_higher = False

    occupation = _occupation_for_age(rng, age, is_student)
    wet, dry = _land_pair(rng, occupation)
    return {
        "age": age,
        "gender": gender,
        "is_student": _bool(is_student),
        "first_higher_education_course": _bool(first_higher),
        "school_background": _school_for_age(rng, age),
        "marital_status": _marital_for_age(rng, age),
        "is_orphan": _bool(bool(rng.random() < (0.12 if age <= 30 else 0.04))),
        "is_destitute": _bool(bool(rng.random() < 0.22)),
        "occupation_category": occupation,
        "wet_land_acres": wet,
        "dry_land_acres": dry,
    }


def generate_pudhumai(rng: np.random.Generator) -> dict[str, object]:
    return {
        "age": int(rng.integers(18, 25)),
        "gender": "female",
        "is_student": _bool(True),
        "first_higher_education_course": _bool(True),
        "school_background": "government_6_to_12",
        "marital_status": _choice(rng, MARITAL, [0.88, 0.10, 0.01, 0.01]),
        "is_orphan": _bool(bool(rng.random() < 0.08)),
        "is_destitute": _bool(bool(rng.random() < 0.20)),
        "occupation_category": "other",
        "wet_land_acres": 0.0,
        "dry_land_acres": 0.0,
    }


def generate_pudhalvan(rng: np.random.Generator) -> dict[str, object]:
    school = _choice(
        rng,
        ("government_6_to_12", "government_or_aided_tamil_medium_6_to_12"),
        [0.45, 0.55],
    )
    return {
        "age": int(rng.integers(18, 25)),
        "gender": "male",
        "is_student": _bool(True),
        "first_higher_education_course": _bool(True),
        "school_background": school,
        "marital_status": _choice(rng, MARITAL, [0.90, 0.09, 0.005, 0.005]),
        "is_orphan": _bool(bool(rng.random() < 0.06)),
        "is_destitute": _bool(bool(rng.random() < 0.18)),
        "occupation_category": "other",
        "wet_land_acres": 0.0,
        "dry_land_acres": 0.0,
    }


def generate_dharmambal(rng: np.random.Generator) -> dict[str, object]:
    age = int(rng.integers(18, 56))
    return {
        "age": age,
        "gender": "female",
        "is_student": _bool(False),
        "first_higher_education_course": _bool(False),
        "school_background": _school_for_age(rng, age),
        "marital_status": "widow_remarrying",
        "is_orphan": _bool(bool(rng.random() < 0.05)),
        "is_destitute": _bool(bool(rng.random() < 0.30)),
        "occupation_category": _occupation_for_age(rng, age, False),
        "wet_land_acres": 0.0,
        "dry_land_acres": 0.0,
    }


def generate_annai(rng: np.random.Generator) -> dict[str, object]:
    age = int(rng.integers(18, 31))
    row = generate_dharmambal(rng)
    row.update(
        {
            "age": age,
            "marital_status": _choice(rng, MARITAL, [0.70, 0.22, 0.04, 0.04]),
            "is_orphan": _bool(True),
            "occupation_category": "other",
            "wet_land_acres": 0.0,
            "dry_land_acres": 0.0,
        }
    )
    return row


def generate_upt(rng: np.random.Generator) -> dict[str, object]:
    age = int(rng.integers(18, 66))
    occupation = _choice(
        rng,
        tuple(sorted(UPT_OCCUPATIONS)),
        [0.40, 0.30, 0.15, 0.15],
    )
    wet, dry = _land_pair(rng, occupation, within_limit=True)
    return {
        "age": age,
        "gender": _choice(rng, GENDERS, [0.47, 0.50, 0.03]),
        "is_student": _bool(False),
        "first_higher_education_course": _bool(False),
        "school_background": _school_for_age(rng, age),
        "marital_status": _marital_for_age(rng, age),
        "is_orphan": _bool(bool(rng.random() < 0.03)),
        "is_destitute": _bool(bool(rng.random() < 0.25)),
        "occupation_category": occupation,
        "wet_land_acres": wet,
        "dry_land_acres": dry,
    }


def generate_unmarried_pension(rng: np.random.Generator) -> dict[str, object]:
    age = int(rng.integers(50, 81))
    occupation = _occupation_for_age(rng, age, False)
    wet, dry = _land_pair(rng, occupation)
    return {
        "age": age,
        "gender": "female",
        "is_student": _bool(False),
        "first_higher_education_course": _bool(False),
        "school_background": _school_for_age(rng, age),
        "marital_status": "never_married",
        "is_orphan": _bool(bool(rng.random() < 0.04)),
        "is_destitute": _bool(True),
        "occupation_category": occupation,
        "wet_land_acres": wet,
        "dry_land_acres": dry,
    }


GENERATORS = {
    "pudhumai": generate_pudhumai,
    "pudhalvan": generate_pudhalvan,
    "dharmambal": generate_dharmambal,
    "annai": generate_annai,
    "upt": generate_upt,
    "unmarried_pension": generate_unmarried_pension,
    "general": generate_general,
}


def _repair(row: dict[str, object]) -> dict[str, object]:
    age = int(row["age"])
    is_student = row["is_student"] == "true"
    first_higher = row["first_higher_education_course"] == "true"
    if not is_student:
        row["first_higher_education_course"] = _bool(False)
    if age < 16:
        row["first_higher_education_course"] = _bool(False)
    if age < 18:
        row["marital_status"] = "never_married"
    if age < 16:
        row["school_background"] = "other"
    if age < 18 or is_student:
        if row["occupation_category"] != "other" and first_higher:
            row["occupation_category"] = "other"
            row["wet_land_acres"] = 0.0
            row["dry_land_acres"] = 0.0
    row["wet_land_acres"] = round(max(0.0, float(row["wet_land_acres"])), 2)
    row["dry_land_acres"] = round(max(0.0, float(row["dry_land_acres"])), 2)
    return row


def generate_citizens(rng: np.random.Generator) -> list[dict[str, object]]:
    if sum(PROFILE_COUNTS.values()) != N_CITIZENS:
        raise ValueError("PROFILE_COUNTS must sum to N_CITIZENS")

    citizens: list[dict[str, object]] = []
    index = 1
    for kind, count in PROFILE_COUNTS.items():
        builder = GENERATORS[kind]
        for _ in range(count):
            row = _repair(builder(rng))
            row["citizen_id"] = f"C{index:06d}"
            citizens.append(row)
            index += 1
    return citizens


def write_citizens(path: Path, citizens: list[dict[str, object]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=CITIZEN_COLUMNS)
        writer.writeheader()
        for row in citizens:
            writer.writerow({key: row[key] for key in CITIZEN_COLUMNS})


def write_eligibility(path: Path, citizens: list[dict[str, object]]) -> list[dict[str, object]]:
    records: list[dict[str, object]] = []
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=ELIGIBILITY_COLUMNS)
        writer.writeheader()
        for citizen in citizens:
            for scheme_id in CORE_SCHEME_IDS:
                result = evaluate_scheme(scheme_id, citizen)
                record = {
                    "citizen_id": citizen["citizen_id"],
                    "scheme_id": scheme_id,
                    **{key: citizen[key] for key in CITIZEN_COLUMNS[1:]},
                    "eligible": result.label,
                    "eligibility_reason": result.reason,
                }
                writer.writerow(record)
                records.append(record)
    return records


def write_statistics(
    path: Path,
    citizens: list[dict[str, object]],
    records: list[dict[str, object]],
) -> None:
    citizen_count = len(citizens)
    record_count = len(records)
    eligible_count = sum(1 for row in records if int(row["eligible"]) == 1)
    not_eligible_count = record_count - eligible_count

    by_scheme: dict[str, Counter[int]] = {scheme_id: Counter() for scheme_id in CORE_SCHEME_IDS}
    for row in records:
        by_scheme[str(row["scheme_id"])][int(row["eligible"])] += 1

    ages = [int(row["age"]) for row in citizens]
    gender_counts = Counter(str(row["gender"]) for row in citizens)
    marital_counts = Counter(str(row["marital_status"]) for row in citizens)
    school_counts = Counter(str(row["school_background"]) for row in citizens)
    occupation_counts = Counter(str(row["occupation_category"]) for row in citizens)
    student_counts = Counter(str(row["is_student"]) for row in citizens)
    first_he_counts = Counter(str(row["first_higher_education_course"]) for row in citizens)
    orphan_counts = Counter(str(row["is_orphan"]) for row in citizens)
    destitute_counts = Counter(str(row["is_destitute"]) for row in citizens)

    lines = [
        "# Dataset statistics",
        "",
        "Phase 3 synthetic research data. These counts describe generated profiles, not real Tamil Nadu residents.",
        "",
        f"Random seed: `{SEED}`.",
        "",
        "## Totals",
        "",
        f"- Citizens: {citizen_count}",
        f"- Citizen-scheme records: {record_count}",
        f"- Eligible records: {eligible_count}",
        f"- Non-eligible records: {not_eligible_count}",
        f"- Overall eligible share: {eligible_count / record_count:.2%}",
        "",
        "## Eligibility by CORE scheme",
        "",
        "| scheme_id | Eligible | Not eligible | Eligible % | Note |",
        "| --- | ---: | ---: | ---: | --- |",
    ]
    for scheme_id in CORE_SCHEME_IDS:
        yes = by_scheme[scheme_id][1]
        no = by_scheme[scheme_id][0]
        share = yes / (yes + no) if (yes + no) else 0.0
        note = "Class imbalance" if share < 0.05 or share > 0.80 else "Usable mix"
        lines.append(f"| {scheme_id} | {yes} | {no} | {share:.2%} | {note} |")

    lines.extend(
        [
            "",
            "Labels were not altered to force balance. Some schemes are naturally rarer",
            "(widow remarriage, older unmarried destitute women) than student schemes.",
            "",
            "## Citizen feature distributions",
            "",
            f"- Age min / median / max: {min(ages)} / {int(np.median(ages))} / {max(ages)}",
            f"- Gender: {dict(gender_counts)}",
            f"- is_student: {dict(student_counts)}",
            f"- first_higher_education_course: {dict(first_he_counts)}",
            f"- school_background: {dict(school_counts)}",
            f"- marital_status: {dict(marital_counts)}",
            f"- is_orphan: {dict(orphan_counts)}",
            f"- is_destitute: {dict(destitute_counts)}",
            f"- occupation_category: {dict(occupation_counts)}",
            "",
            "## Missing values and duplicates",
            "",
            "- Missing values in `citizens.csv`: 0 (all CORE fields are required and generated).",
            "- Missing values in `eligibility_dataset.csv`: 0.",
            f"- Duplicate citizen_id values: {citizen_count - len({row['citizen_id'] for row in citizens})}",
            f"- Duplicate citizen_id + scheme_id pairs: {record_count - len({(row['citizen_id'], row['scheme_id']) for row in records})}",
            "",
            "## Class imbalance",
            "",
            "Overall negatives outnumber positives because each citizen is tested against six schemes",
            "and most people fail most schemes. Per-scheme eligible counts are reported above.",
            "Phase 4 should use stratified splits and per-scheme metrics rather than changing labels.",
            "",
        ]
    )
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    if sum(PROFILE_COUNTS.values()) != N_CITIZENS:
        print("ERROR: profile counts do not sum to N_CITIZENS", file=sys.stderr)
        return 1

    rng = np.random.default_rng(SEED)
    root = repo_root()
    citizens_path = root / "dataset" / "raw" / "citizens.csv"
    eligibility_path = root / "dataset" / "processed" / "eligibility_dataset.csv"
    stats_path = root / "docs" / "dataset_statistics.md"

    citizens = generate_citizens(rng)
    write_citizens(citizens_path, citizens)
    records = write_eligibility(eligibility_path, citizens)
    write_statistics(stats_path, citizens, records)

    eligible_count = sum(1 for row in records if int(row["eligible"]) == 1)
    print(f"Wrote {len(citizens)} citizens to {citizens_path}")
    print(f"Wrote {len(records)} eligibility rows to {eligibility_path}")
    print(f"Eligible={eligible_count} Not eligible={len(records) - eligible_count}")
    print(f"Wrote statistics to {stats_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
