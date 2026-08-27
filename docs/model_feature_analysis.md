# Model feature analysis

These values are **model-derived associations** on synthetic, rule-labelled data.
They are not causal explanations of government policy and do not describe real applicants.

## Logistic Regression coefficients

After one-hot encoding and numeric standardisation. Larger absolute coefficient means a stronger association with the predicted log-odds of `eligible=1`.

| feature | coefficient |
| --- | ---: |
| `first_higher_education_course_True` | 2.5162 |
| `first_higher_education_course_False` | -2.2682 |
| `scheme_id_TN-REV-001` | 2.0099 |
| `is_student_False` | 1.5533 |
| `is_student_True` | -1.3053 |
| `marital_status_widow_remarrying` | 1.1806 |
| `occupation_category_other` | -0.9738 |
| `is_orphan_True` | 0.8546 |
| `marital_status_widow` | -0.6664 |
| `gender_female` | 0.6102 |
| `is_orphan_False` | -0.6066 |
| `occupation_category_small_marginal_farmer` | 0.5851 |
| `scheme_id_TN-SW-004` | -0.5445 |
| `marital_status_married` | -0.4606 |
| `scheme_id_TN-REV-002` | -0.4201 |
| `scheme_id_TN-SW-001` | -0.3950 |
| `scheme_id_TN-SW-006` | -0.3445 |
| `is_destitute_True` | 0.3305 |
| `gender_transgender` | -0.3146 |
| `occupation_category_agricultural_labourer` | 0.2384 |

## Decision Tree feature importance

| feature | importance |
| --- | ---: |
| `occupation_category_other` | 0.1762 |
| `scheme_id_TN-REV-001` | 0.1308 |
| `gender_female` | 0.1191 |
| `scheme_id_TN-SW-004` | 0.1009 |
| `is_orphan_True` | 0.0950 |
| `first_higher_education_course_False` | 0.0719 |
| `scheme_id_TN-SW-002` | 0.0631 |
| `scheme_id_TN-SW-006` | 0.0515 |
| `scheme_id_TN-REV-002` | 0.0406 |
| `scheme_id_TN-SW-001` | 0.0370 |
| `marital_status_married` | 0.0283 |
| `age` | 0.0222 |
| `is_student_True` | 0.0164 |
| `marital_status_widow` | 0.0148 |
| `school_background_other` | 0.0069 |

## Random Forest feature importance

| feature | importance |
| --- | ---: |
| `scheme_id_TN-REV-001` | 0.1770 |
| `occupation_category_other` | 0.0798 |
| `scheme_id_TN-SW-002` | 0.0713 |
| `scheme_id_TN-SW-006` | 0.0700 |
| `scheme_id_TN-SW-001` | 0.0628 |
| `scheme_id_TN-REV-002` | 0.0582 |
| `scheme_id_TN-SW-004` | 0.0579 |
| `age` | 0.0563 |
| `gender_female` | 0.0383 |
| `marital_status_widow_remarrying` | 0.0337 |
| `gender_male` | 0.0320 |
| `is_orphan_True` | 0.0270 |
| `is_student_True` | 0.0257 |
| `first_higher_education_course_False` | 0.0250 |
| `first_higher_education_course_True` | 0.0247 |

Full ranked tables: `ml/models/evaluation/logistic_regression_coefficients.csv`,
`decision_tree_feature_importance.csv`, and `random_forest_feature_importance.csv`.

## Phase 5 review

### Most influential features

`scheme_id` one-hot columns, `occupation_category_other`, `gender_female`, first-course flags, orphan flags, `widow_remarrying`, and `age`. These match the documented CORE tests.

### Scheme-specific features

`scheme_id` is required for a citizen–scheme row. The no-`scheme_id` experiment is much weaker. That is expected, not a data bug.

### Features that contribute little

`wet_land_acres` and `dry_land_acres` matter only for TN-REV-001. `gender_transgender` and some occupation dummies have small tree importance because they are rare or used by one scheme.

### Suspicious or redundant features

One-hot boolean pairs are redundant (`is_student_True` vs `is_student_False`). Logistic Regression can assign opposite signs to the pair. They were **not** removed in this phase; dropping them is a possible later cleanup, not an automatic change.

No feature was deleted from the training set.
