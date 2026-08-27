# ML feature engineering

Phase 4 feature choices for `dataset/processed/eligibility_dataset.csv`. Source labels were not changed.

## Target

`eligible` ∈ {0, 1}

## Columns excluded from features

| Column | Why it is excluded |
| --- | --- |
| `citizen_id` | Identifier only. Using it would leak identity and is not a socio-economic attribute. |
| `eligibility_reason` | Written by the same rule engine that created the label. Including it would be direct target leakage. |
| `eligible` | The target. |

## Columns used as features

| Column | Type in the pipeline | Why it is used |
| --- | --- | --- |
| `age` | numeric | Official age bands for UPT, unmarried-women pension, and the documented marriage-assistance convention |
| `wet_land_acres` | numeric | Official UPT land wording |
| `dry_land_acres` | numeric | Official UPT land wording |
| `gender` | categorical (one-hot) | Several CORE schemes are gender-specific |
| `is_student` | categorical (one-hot) | Required for the two higher-education schemes |
| `first_higher_education_course` | categorical (one-hot) | Official first-course rule |
| `school_background` | categorical (one-hot) | Official school-path rules |
| `marital_status` | categorical (one-hot) | Widow remarriage and never-married pension rules |
| `is_orphan` | categorical (one-hot) | Annai Therasa rule |
| `is_destitute` | categorical (one-hot) | Unmarried-women pension rule |
| `occupation_category` | categorical (one-hot) | UPT main-member occupations |
| `scheme_id` | categorical (one-hot) | Each row is a citizen–scheme pair; the six CORE rules differ |

Boolean fields stay as `true`/`false` strings and are one-hot encoded with the other categoricals. They are not treated as numeric 0/1 outside the encoder.

No extra constructed features (interactions, polynomials, embeddings) are added in this baseline.

## Why `scheme_id` is a feature

The dataset is not “one citizen, one label”. It is “one citizen evaluated against one scheme”. The same woman can be eligible for Pudhumai Penn and ineligible for Uzhavar Pathukappu. Without `scheme_id`, the model is asked to output different labels for identical citizen attributes. That is possible only if it memorizes row order or collapses conflicting labels.

Primary experiment: citizen features + `scheme_id`.

Alternative experiment: citizen features only, trained on the same citizen split, so the effect of `scheme_id` can be compared.

## What was not done

- No use of ADVANCED or HOLD schemes
- No annual income (excluded from the CORE feature set)
- No scaling of tree-model numeric inputs
- No preprocessing fitted on the full dataset before the split
