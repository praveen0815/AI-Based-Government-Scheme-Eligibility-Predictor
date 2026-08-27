# Phase 22 results — Personalized Progress & Activity Dashboard

Date: **2026-08-27**.

This phase upgrades the authenticated dashboard on top of Phases 1–21. The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, JWT/Google authentication, wallet ownership, history, comparison, PDF, documents, readiness, and insights contracts were not changed.

## What changed

- Additive owner-only API `GET /api/v1/dashboard` aggregates wallet completeness, recommendation history, document progress, and readiness stages.
- `/dashboard` now shows progress cards, a citizen journey timeline, a preparation summary, unified recent activity, and the requested quick actions.
- English/Tamil copy uses the existing `useI18n()` dictionaries.
- Existing recommendation preview, insights, documents, readiness, compare, and PDF actions remain on the page.

## Journey and activity

Journey stages: Profile Created → Profile Completed → Eligibility Checked → Schemes Recommended → Documents Prepared → Application Readiness.

Recent activity lists recommendation checks, document-preparation updates, and readiness-stage updates with date/time. Completed Preparation on the readiness tracker still does not mean a government application was submitted or approved.

## Testing

- Backend `python -m unittest tests.test_dashboard_api -v`: **4 passed**. Unauthenticated HTTP 401; OpenAPI lists `/api/v1/dashboard`. Database tests: empty overview without a wallet; owner-only activity after recommend/document/readiness updates; another user sees an empty overview.
- Frontend dashboard Vitest: **11 passed**, including redirect, empty wallet, completeness, history activity, journey stages, document and readiness summaries, insights, and no `/recommend` call from the dashboard.

## Limitations

The dashboard summarizes research-prototype progress only. Users must still verify official scheme conditions and apply on the government website.
