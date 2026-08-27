# Dataset statistics

Phase 3 synthetic research data. These counts describe generated profiles, not real Tamil Nadu residents.

Random seed: `20260814`.

## Totals

- Citizens: 5000
- Citizen-scheme records: 30000
- Eligible records: 3653
- Non-eligible records: 26347
- Overall eligible share: 12.18%

## Eligibility by CORE scheme

| scheme_id | Eligible | Not eligible | Eligible % | Note |
| --- | ---: | ---: | ---: | --- |
| TN-SW-001 | 445 | 4555 | 8.90% | Usable mix |
| TN-SW-002 | 461 | 4539 | 9.22% | Usable mix |
| TN-SW-004 | 356 | 4644 | 7.12% | Usable mix |
| TN-SW-006 | 408 | 4592 | 8.16% | Usable mix |
| TN-REV-001 | 1669 | 3331 | 33.38% | Usable mix |
| TN-REV-002 | 314 | 4686 | 6.28% | Usable mix |

Labels were not altered to force balance. Some schemes are naturally rarer
(widow remarriage, older unmarried destitute women) than student schemes.

## Citizen feature distributions

- Age min / median / max: 0 / 31 / 90
- Gender: {'female': 2823, 'male': 2042, 'transgender': 135}
- is_student: {'true': 1468, 'false': 3532}
- first_higher_education_course: {'true': 1000, 'false': 4000}
- school_background: {'government_6_to_12': 2070, 'government_or_aided_tamil_medium_6_to_12': 1168, 'other': 1762}
- marital_status: {'never_married': 2433, 'married': 1666, 'widow': 427, 'widow_remarrying': 474}
- is_orphan: {'false': 4430, 'true': 570}
- is_destitute: {'false': 3608, 'true': 1392}
- occupation_category: {'other': 3027, 'small_marginal_farmer': 677, 'agricultural_labourer': 649, 'inland_fishing': 374, 'plantation_labourer': 273}

## Missing values and duplicates

- Missing values in `citizens.csv`: 0 (all CORE fields are required and generated).
- Missing values in `eligibility_dataset.csv`: 0.
- Duplicate citizen_id values: 0
- Duplicate citizen_id + scheme_id pairs: 0

## Class imbalance

Overall negatives outnumber positives because each citizen is tested against six schemes
and most people fail most schemes. Per-scheme eligible counts are reported above.
Phase 4 should use stratified splits and per-scheme metrics rather than changing labels.

