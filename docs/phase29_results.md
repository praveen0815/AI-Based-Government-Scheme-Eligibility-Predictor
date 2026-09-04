# Phase 29 results — Performance and system evaluation

Date: **2026-09-04**.

This phase adds system performance monitoring and a research evaluation summary on top of Phases 1–28. The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, authentication, wallet, history, comparison, PDF, documents, readiness, insights, notifications, catalog, and existing API contracts were not changed.

## What changed

- An in-process middleware records request count, error count, and min/average/max response time for `/predict`, `/recommend`, `/schemes`, `/evaluation`, and `/insights`.
- `GET /api/v1/system-evaluation` is an authenticated read-only summary of existing ML metrics, Rule-vs-ML agreement, dataset counts, live API timings, and system health.
- Protected `/system-evaluation` shows ML Performance, Hybrid Agreement, Dataset Summary, API Performance, and System Health, with a clear Academic Research Prototype disclaimer.
- The page distinguishes saved Phase 4/5 ML evaluation from live API timings.
- English/Tamil copy uses the existing `useI18n()` dictionaries.
- No passwords, JWTs, Google tokens, identity numbers, or wallet-sensitive fields are stored or displayed.

## Testing

Backend `python -m unittest tests.test_performance_api -q`: **6 passed**. Unauthenticated HTTP 401; OpenAPI lists `/api/v1/system-evaluation`; evaluation overview is unchanged; in-process counters record `/schemes`, `/evaluation`, and `/insights`. Authenticated summary separates saved ML metrics from live API timings.

Frontend `npm test`: **130 passed**, including the protected `/system-evaluation` page and the five research sections.

## Limitations

This is research-prototype monitoring only. It does not add new ML algorithms, retraining, production monitoring services, or deployment infrastructure.
