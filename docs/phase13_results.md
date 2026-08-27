# Phase 13 results — Hybrid Rule + ML engine

Date: **2026-08-15**.

This phase adds a hybrid documented-rule + Decision Tree comparison. The model was not retrained. `citizens.csv`, `eligibility_dataset.csv`, and `decision_tree.joblib` were not modified. Authentication and wallet ownership were not changed.

A separate UI redesign note is in `docs/phase13_ui_redesign.md`.

## What changed

- Backend rule-engine service wraps `ml/src/eligibility_rules.py`.
- Hybrid prediction service compares rule and ML results.
- `POST /api/v1/predict` keeps the existing request body and existing response fields, and adds `rule_result`, `rule_reasons`, `ml_prediction`, and `agreement`.
- `POST /api/v1/recommend` still evaluates six CORE schemes. The documented rule result is the eligibility reference. ML comparison fields are included. Ranking is unchanged.
- Results cards show documented conditions, ML prediction, model probability, and agreement or disagreement.
- `GET /api/v1/evaluation/hybrid` reports Phase 5 Decision Tree agreement with rule-derived labels on the held-out synthetic test set (6,000 / 6,000, 0 disagreements).

## Testing

- Frontend `npm test`: 48 passed.
- Frontend `npm run build`: succeeded.
- New hybrid backend tests in `tests/test_hybrid_api.py`: 10 passed, including rule eligible/non-eligible, agreement, disagreement (ML stubbed), `/predict`, `/recommend`, 422 validation, and `/evaluation/hybrid`.
- A full `unittest discover` run in this session stalled on `GET /health` while PostgreSQL did not return from `SELECT 1`. That health check is unchanged. Re-run the full suite when the database is responsive.

## Limitations

The Decision Tree already reproduced the documented rules on the synthetic test set, so live disagreements are expected to be rare. Disagreement handling is implemented and unit-tested by stubbing the ML explanation.
