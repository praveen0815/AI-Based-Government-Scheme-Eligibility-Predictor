# Phase 11 results

Date: **2026-08-14**.

## 1. Phase objective

Add a public research/evaluation dashboard that presents existing Phase 4/5 ML experiment results and project statistics for college review.

This system remains an academic AI research prototype. The dashboard does not train models, change labels, or claim government accuracy.

## 2. Architecture

```
React /evaluation
        ↓
GET /api/v1/evaluation/*  (public, read-only)
        ↓
EvaluationService (cached file reads)
        ↓
Phase 4/5 artifacts + official catalog
```

The Decision Tree artifact is not reloaded for this dashboard. Wallet, auth, prediction, and recommendation paths are unchanged.

## 3. New API endpoints

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/v1/evaluation/overview` | Public |
| GET | `/api/v1/evaluation/models` | Public |
| GET | `/api/v1/evaluation/schemes` | Public |
| GET | `/api/v1/evaluation/features` | Public |
| GET | `/api/v1/evaluation/confusion-matrix` | Public |
| GET | `/api/v1/evaluation/limitations` | Public |

These routes never return passwords, password hashes, JWTs, user profiles, or wallet rows.

## 4. Metric sources

| Displayed value | Source | How it is produced |
| --- | --- | --- |
| 5,000 citizens; 30,000 rows; 3,653 eligible; 26,347 not eligible | `dataset/processed/eligibility_dataset.csv` | Counted at API load time |
| 13 catalog schemes | `dataset/raw/schemes.csv` | Catalog row count |
| 6 CORE schemes | existing `CORE_SCHEME_IDS` | Unchanged ML scope |
| Train 4,000 / test 1,000 citizens | `ml/models/baseline/run_metadata.json` | Existing Phase 4 split |
| Overall LR / DT / RF metrics | `run_metadata.json` → `primary_overall` | Existing Phase 4 scores |
| Per-scheme ML metrics | `docs/model_baseline_results.md` | Copied into the evaluation service with a source citation |
| Confusion matrices | `ml/models/evaluation/confusion_matrix_*.csv` | Existing Phase 4 CSVs |
| Feature importance / coefficients | matching CSVs under `ml/models/evaluation/` | Existing Phase 4/5 files |
| Official scheme names and URLs | `dataset/raw/schemes.csv` | Catalog only; no invented URLs |
| Research limitations | `docs/ml_limitations.md` | Academic wording only |

The React UI does not hard-code these numbers. The backend is the source of truth.

## 5. Frontend

New public route: `/evaluation`.

Header link: **Evaluation**.

Sections: project overview, dataset distribution, model comparison, scheme-wise distribution, selectable confusion matrix, feature analysis, system flow, research limitations, official data sources.

The Decision Tree row is labelled **Selected prototype model**. The page does not say the model is government accurate.

## 6. Files not modified

- `dataset/raw/citizens.csv`
- `dataset/processed/eligibility_dataset.csv`
- `ml/models/baseline/decision_tree.joblib`
- other trained artifacts
- recommendation ranking logic
- wallet schema

## 7. Testing

Backend: `python -m unittest discover -s tests -v` — **78 passed**.

Frontend: `npm test` — **48 passed**.

Build: `npm run build` — production bundle succeeded.

## 8. Assumptions

- The dashboard shows the primary Phase 4 experiment (`scheme_id` included). Alternative no-`scheme_id` scores remain in `run_metadata.json` and are not displayed.
- Feature importance is an association measure, not a causal claim.
- Evaluation APIs are public because they expose only research artifacts, not user data.

## 9. Limitations

- Synthetic citizens and rule-derived labels.
- Near-perfect Decision Tree scores are expected because the model receives the same inputs the rule engine used.
- Predicted eligibility is not government approval.
- CORE schemes only.

## 10. Recommended next phase

Stop here unless a later phase is requested. Do not add deployment, LLMs, Aadhaar, OTP, payment, government APIs, an admin panel, or a new ML algorithm automatically.
