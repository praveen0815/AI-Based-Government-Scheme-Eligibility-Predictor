# Dataset inspection

Phase 4 read-only inspection of `dataset/processed/eligibility_dataset.csv`.
The source file was not modified.

## Shape

- Rows: 30000
- Columns: 15

## Columns and dtypes (as loaded)

| Column | dtype | Non-null | Missing |
| --- | --- | ---: | ---: |
| `citizen_id` | str | 30000 | 0 |
| `scheme_id` | str | 30000 | 0 |
| `age` | int64 | 30000 | 0 |
| `gender` | str | 30000 | 0 |
| `is_student` | bool | 30000 | 0 |
| `first_higher_education_course` | bool | 30000 | 0 |
| `school_background` | str | 30000 | 0 |
| `marital_status` | str | 30000 | 0 |
| `is_orphan` | bool | 30000 | 0 |
| `is_destitute` | bool | 30000 | 0 |
| `occupation_category` | str | 30000 | 0 |
| `wet_land_acres` | float64 | 30000 | 0 |
| `dry_land_acres` | float64 | 30000 | 0 |
| `eligible` | int64 | 30000 | 0 |
| `eligibility_reason` | str | 30000 | 0 |

## Duplicates and missing values

- Missing cells: 0
- Duplicate rows: 0
- Duplicate citizen_id + scheme_id: 0

## Target distribution

- eligible=1: 3653 (12.18%)
- eligible=0: 26347 (87.82%)

## Target distribution by scheme

| scheme_id | Rows | Eligible | Eligible % |
| --- | ---: | ---: | ---: |
| TN-REV-001 | 5000 | 1669 | 33.38% |
| TN-REV-002 | 5000 | 314 | 6.28% |
| TN-SW-001 | 5000 | 445 | 8.90% |
| TN-SW-002 | 5000 | 461 | 9.22% |
| TN-SW-004 | 5000 | 356 | 7.12% |
| TN-SW-006 | 5000 | 408 | 8.16% |

## Categorical cardinality

| Column | Unique values | Values |
| --- | ---: | --- |
| `scheme_id` | 6 | TN-REV-001, TN-REV-002, TN-SW-001, TN-SW-002, TN-SW-004, TN-SW-006 |
| `gender` | 3 | female, male, transgender |
| `is_student` | 2 | False, True |
| `first_higher_education_course` | 2 | False, True |
| `school_background` | 3 | government_6_to_12, government_or_aided_tamil_medium_6_to_12, other |
| `marital_status` | 4 | married, never_married, widow, widow_remarrying |
| `is_orphan` | 2 | False, True |
| `is_destitute` | 2 | False, True |
| `occupation_category` | 5 | agricultural_labourer, inland_fishing, other, plantation_labourer, small_marginal_farmer |

## Numeric ranges

| Column | Min | Max | Mean |
| --- | ---: | ---: | ---: |
| `age` | 0.00 | 90.00 | 36.31 |
| `wet_land_acres` | 0.00 | 7.99 | 0.39 |
| `dry_land_acres` | 0.00 | 11.99 | 0.63 |
