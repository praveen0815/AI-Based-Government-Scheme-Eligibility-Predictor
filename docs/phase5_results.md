# Phase 5 results

Model improvement, explainability, and rule-versus-ML analysis. No API or frontend was built.

## Environment

Standardized on **Python 3.12** (`ml/.venv` created with `py -3.12`). Phase 4 models were retrained with the same code and seed so artifacts match this environment.

| Item | Version |
| --- | --- |
| Python | 3.12.10 |
| scikit-learn | 1.9.0 |
| pandas | 3.0.5 |
| numpy | 2.5.2 |
| Random seed | 20260814 |
| Dataset SHA-256 | `ba91158194b4060be01894306d72ae25b96e4abeebbdf4ff61e93ffd059d30d0` |

## Rule engine results

On the 6,000-row test set the rule engine is the label source:

- Eligible (rule): 731
- Not eligible (rule): 5,269
- Self-agreement: 1.0000
- Disagreements: 0

## ML comparison

How well each model **reproduces those rule labels** (not official discovery, not real outcomes):

| Method | Agreement | Disagreements | FP | FN |
| --- | ---: | ---: | ---: | ---: |
| Rule engine | 1.0000 | 0 | 0 | 0 |
| Decision Tree | 1.0000 | 0 | 0 | 0 |
| Random Forest | 0.9992 | 5 | 5 | 0 |
| Logistic Regression | 0.7368 | 1,579 | 1,413 | 166 |

Random Forest’s five errors are all false positives on TN-REV-001. Logistic Regression disagrees most on TN-REV-001 (496 FP). Details: `docs/rule_vs_ml_comparison.md`.

## Threshold analysis

Default threshold remains **0.50**. It was not changed for any “production” use.

Decision Tree metrics stay 1.0000 at 0.30, 0.40, 0.50, 0.60, and 0.70 because leaf probabilities are essentially 0 or 1.

Logistic Regression moves as expected:

| Threshold | Precision | Recall | F1 | Balanced Accuracy | PR-AUC |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0.30 | 0.2149 | 0.9672 | 0.3517 | 0.7385 | 0.3255 |
| 0.50 | 0.2856 | 0.7729 | 0.4171 | 0.7524 | 0.3255 |
| 0.70 | 0.3627 | 0.4446 | 0.3995 | 0.6681 | 0.3255 |

Full table: `docs/threshold_analysis.md`.

## Explainability approach

`ml/src/explanation.py` returns a structured object:

- `prediction`: `eligible` or `not_eligible`
- `confidence`: model probability of the predicted class
- `probability_eligible` / `probability_not_eligible`
- `important_factors`: tree path, logistic contributions, or **global** forest importance
- `human_readable`: deterministic text from **actual feature values** and documented CORE rules
- `disclaimer`: probabilities are not government approval

No LLM is used. Example (Decision Tree, test citizen, TN-SW-006):

> Not eligible for Annai Therasa orphan-girl marriage because the required orphan status is not satisfied.

Tree path for that row included `scheme_id_TN-SW-006 > 0.5` and `is_orphan_True <= 0.5`.

## Selected baseline model

**Decision Tree** (`ml/models/baseline/decision_tree.joblib`).

See `docs/model_selection.md`. It is the prototype default because it matches the rule engine, is path-explainable, and is small. It must be described as a rule-reproducing model.

## Important features

From Phase 4/5 encoded-feature analysis (associations, not causes):

1. **Most influential:** `scheme_id_*`, `occupation_category_other`, `gender_female`, `first_higher_education_course_*`, `is_orphan_*`, `marital_status_widow_remarrying`, `age`
2. **Scheme-specific:** one-hot `scheme_id` columns. Removing them collapses performance (tree F1 1.00 → 0.31).
3. **Little contribution:** land acres are used only for UPT; transgender and some occupation dummies have small tree importance.
4. **Suspicious / redundant:** boolean pairs (`is_student_True` and `is_student_False`) are complementary; logistic signs can look odd in isolation because of that encoding. They were not removed.

Features were not dropped automatically.

## Limitations

See `docs/ml_limitations.md`. Short version: synthetic people, rule labels, no real outcomes, perfect trees are expected, do not quote these scores as field accuracy, retrain when official rules change.

## Recommendation for the next implementation phase

Phase 6, if approved, should wrap the **Decision Tree pipeline** and `explanation.py` in a FastAPI read-only predict endpoint that:

- accepts CORE citizen features + `scheme_id`
- returns prediction, both class probabilities, human-readable rule text, and the disclaimer
- does not claim government approval
- does not add login, React, or PostgreSQL unless that is a later explicit phase

Do not start that API until this phase is approved.
