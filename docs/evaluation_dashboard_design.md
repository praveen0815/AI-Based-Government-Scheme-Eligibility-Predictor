# Evaluation dashboard design

A public, read-only research dashboard for college review. It presents existing Phase 4/5 metrics. It does not score wallets, train models, or claim government accuracy.

## Architecture

```
React /evaluation
        ↓
GET /api/v1/evaluation/*
        ↓
EvaluationService (cached file reads)
        ↓
run_metadata.json
eligibility_dataset.csv
confusion_matrix_*.csv
feature importance CSVs
schemes.csv
docs/model_baseline_results.md (per-scheme ML scores)
docs/ml_limitations.md (limitation text)
```

The Decision Tree artifact is not loaded for this dashboard. The recommendation algorithm is unchanged.

## Endpoints

| Path | Content |
| --- | --- |
| `/api/v1/evaluation/overview` | Dataset counts, split, selected model |
| `/api/v1/evaluation/models` | Overall test metrics for three baselines |
| `/api/v1/evaluation/schemes` | CORE eligibility distribution plus separate per-scheme ML scores |
| `/api/v1/evaluation/features` | Tree importances and logistic coefficients |
| `/api/v1/evaluation/confusion-matrix` | TN/FP/FN/TP for each model |
| `/api/v1/evaluation/limitations` | Research limits and official catalog URLs |

These routes are public and read-only. They never return passwords, JWTs, users, or wallet rows.

## Metric sources

| Displayed value | Source |
| --- | --- |
| 5,000 citizens, 30,000 rows, 3,653 / 26,347 | Counted from `dataset/processed/eligibility_dataset.csv` |
| Train 4,000 / test 1,000 | `ml/models/baseline/run_metadata.json` |
| Overall accuracy, F1, ROC-AUC, … | `run_metadata.json` → `primary_overall` |
| Per-scheme ML scores | `docs/model_baseline_results.md` (Phase 4 tables) |
| Confusion matrices | `ml/models/evaluation/confusion_matrix_*.csv` |
| Feature values | matching CSVs under `ml/models/evaluation/` |
| Scheme names and official URLs | `dataset/raw/schemes.csv` |
| 13 catalog schemes | catalog row count |

## UI sections

`/evaluation` is public. Sections: overview cards, eligible/not-eligible bar, model table, scheme distribution, selectable confusion matrix, feature tables, system flow, limitations, official sources.

## Assumptions

- Primary experiment is the `scheme_id`-included Phase 4 setup.
- Alternative (no `scheme_id`) metrics stay in `run_metadata.json` and are not shown on the dashboard.
- Feature importance is not causal.
