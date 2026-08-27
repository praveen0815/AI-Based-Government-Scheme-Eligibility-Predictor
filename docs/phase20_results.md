# Phase 20 results — Eligibility Insights

Date: **2026-08-24**.

This phase adds personalized eligibility insights on top of Phases 1–19. The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, JWT/Google authentication, wallet ownership, history, comparison, PDF, and document-checklist contracts were not changed.

## What changed

- Authenticated API `GET /api/v1/insights` loads the caller's wallet and reuses `recommend_for_citizen`.
- Response includes predicted-eligible count, not-recommended count, rule reasons, ML prediction, model probability, agreement, profile completeness, and Things to Review.
- Insights do not insert recommendation history.
- Frontend route `/insights` with sidebar/header **Insights** navigation.
- Dashboard **Eligibility Insights** card shows the predicted-eligible count and **View Insights**.
- English/Tamil copy uses the existing `useI18n()` dictionaries.

## Safe wording

The UI and API use **Predicted eligible** and **Not recommended by this prototype**. They do not say officially rejected. When Rule and ML differ, the documented rule remains the reference.

## Testing

- Backend `python -m unittest tests.test_insights_api -v`: unauthenticated HTTP 401; OpenAPI lists `/api/v1/insights`. Database tests (when `TEST_DATABASE_URL` is available): missing wallet HTTP 404; six CORE schemes evaluated; history count stays 0; another user without a wallet receives 404.
- Frontend `npm test`: **100 passed**, including insights redirect/empty/section tests and dashboard View Insights.

## Limitations

Insights explain the current research prototype only. Users must still verify official scheme conditions on the government website. Completeness is a field-presence measure, not an eligibility score.
