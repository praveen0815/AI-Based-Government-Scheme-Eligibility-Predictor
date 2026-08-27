# ML problem definition

Phase 3 has generated synthetic citizens and rule-derived labels. No model is trained yet.

## Problem

**Citizen + Scheme → Eligibility Classification**

For one citizen profile and one CORE scheme, predict whether the documented eligibility rules are satisfied.

| Item | Definition |
| --- | --- |
| Input | Citizen socio-economic features from `docs/citizen_feature_specification.md` plus `scheme_id` |
| Target | `eligible` ∈ {0, 1} |

```
citizen features + scheme  →  eligible ∈ {0, 1}
```

This is a **multi-scheme** problem implemented as repeated binary decisions: one citizen may be eligible for several CORE schemes and ineligible for others.

The Phase 3 file `dataset/processed/eligibility_dataset.csv` stores those pairs. Labels are produced by `ml/src/eligibility_rules.py` from official CORE criteria. A later ML model will learn to predict the same labels. The synthetic dataset does **not** represent real-world citizen outcomes.

## 1. Why this is a classification problem

Official welfare rules are yes/no tests (age band, gender, student status, widow status, land ceiling, and so on). The academic task is to learn those decision boundaries from labelled examples and later explain them. Regression (predicting a rupee benefit) and ranking (ordering schemes without a yes/no rule) are different problems and are out of scope for the first model.

## 2. Why synthetic citizen profiles are required

A supervised classifier needs many citizen–scheme pairs with known labels. Tamil Nadu does not publish identifiable beneficiary microdata for student use. The scheme catalog is public; individual residents’ income, widow status and disability status are not. Synthetic profiles are the only way to create labelled rows that exercise the CORE rules without collecting personal data.

Phase 3 generated 5,000 synthetic citizens and 30,000 labelled citizen–scheme rows. See `docs/synthetic_data_generation.md`.

## 3. Why real citizen personal data will not be used

This is an academic project. Real Aadhaar, ration-card, income, marital and disability records would create consent and privacy risk. Phase 2 collected only public scheme rules. Phase 3 created fictional profiles only. No scrape of beneficiary lists was used.

## 4. How labels will be derived

Labels will be **rule-derived**, not human-guessed and not taken from real applications.

For each CORE scheme, a deterministic checker will apply only **VERIFIED** eligibility factors (and the documented marriage-assistance age convention below). Example:

- TN-SW-001: `gender = female` AND `is_student = true` AND `first_higher_education_course = true` AND `school_background = government_6_to_12`
- TN-SW-002: `gender = male` AND `is_student = true` AND `first_higher_education_course = true` AND `school_background = government_or_aided_tamil_medium_6_to_12`
- TN-SW-004: `gender = female` AND `marital_status = widow_remarrying` AND `age >= 18`
- TN-SW-006: `gender = female` AND `is_orphan = true` AND `age >= 18`
- TN-REV-001: `age` in 18–65 AND `occupation_category` in the official member groups AND (`wet_land_acres` <= 2.50 OR `dry_land_acres` <= 5.00), following the official land wording
- TN-REV-002: `gender = female` AND `marital_status = never_married` AND `age >= 50` AND `is_destitute = true`

The age >= 18 test on TN-SW-004 and TN-SW-006 cites the Social Welfare Department page on the Prohibition of Child Marriage Act, which states that marriage assistance schemes are designed so benefits reach a girl who has completed 18 years. That convention is recorded here because `age_min` was not printed on the marriage-assistance scheme page itself.

Empty scheme fields mean “this factor is not used”, not “the citizen fails”.

## 5. How unresolved rules are excluded

Rows with `ml_scope = HOLD` or `eligibility_rule_status = UNRESOLVED` are **out of the first training set**.

| Excluded scheme | Why labels are not generated |
| --- | --- |
| TN-SW-005 | Official income ceilings conflict. |
| TN-SW-007 | Official education statements conflict. |
| TN-REV-003 | Age, income, BPL and pension amount are not on the available official pages. |
| TN-DAW-001 | Allowance-specific disability percentage is not stated. |

`ADVANCED` schemes (Girl Child Protection, KMUT, CMCHIS) stay in the catalog and may be labelled in a later phase with extra features. They are not in the first dataset.

A CORE field that is only `PARTIALLY_VERIFIED` (for example missing documents) is not used as a label condition.

## 6. How the model will later be evaluated

Evaluation starts only after synthetic data exist. Planned checks:

1. **Hold-out split** of synthetic citizen–scheme pairs (for example 70% train / 15% validation / 15% test), stratified by `scheme_id` and label.
2. **Metrics:** accuracy, precision, recall and F1, overall and **per scheme**. Per-scheme scores matter because class balance will differ (for example age-50 unmarried destitute women vs students).
3. **Rule agreement:** compare model predictions with the deterministic checker on the test set. A useful first model should approach the rule checker, not invent new criteria.
4. **Error review:** inspect false positives/negatives by feature (wrong gender, school type, land ceiling) to see whether the model learned the official tests.
5. **No real beneficiary file** will be used as a test set in this project unless a later, approved, anonymised official dataset is provided.

Training, hyperparameter search and model export are out of scope until the synthetic dataset is approved.
