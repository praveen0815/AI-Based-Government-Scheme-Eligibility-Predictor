# Application Readiness results

Date: **2026-08-24**.

This increment adds Application Readiness Tracking on top of Phases 1–20. The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, JWT/Google authentication, wallet ownership, history, comparison, PDF, document-checklist, and insights contracts were not changed.

The repository already uses `docs/phase21_results.md` for **security and production hardening** (2026-08-22). That file is unchanged. These results document the later Application Readiness tracker.

## What changed

- Owner-only table `application_readiness` stores one stage per authenticated user and CORE scheme.
- JWT APIs: `GET /api/v1/readiness`, `GET /api/v1/readiness/schemes/{scheme_id}`, `PATCH /api/v1/readiness/schemes/{scheme_id}`.
- Trackers are history-gated. GET does not insert rows. Another user receives HTTP 404.
- Frontend route `/readiness` with sidebar/header **Application Readiness** navigation.
- Dashboard **Application Readiness** card shows schemes being prepared, overall preparation progress, and **Manage Readiness**.
- English/Tamil copy uses the existing `useI18n()` dictionaries.

## Stages

Not Started, Profile Ready, Documents In Progress, Ready to Apply, Official Source Visited, Completed Preparation.

The API and UI state:

> Completed Preparation does not mean the government application was submitted or approved.

## Testing

- Backend `python -m unittest tests.test_readiness_api -v`: **9 passed**. Unauthenticated HTTP 401; OpenAPI lists readiness routes; stage progress is 0/20/40/60/80/100. Database tests: history gate, GET does not insert, owner-only PATCH, invalid stage HTTP 422, account delete removes rows.
- Frontend `npm test`: **104 passed**, including `/readiness` redirect, empty state, stage update, Document Preparation link, official source link, dashboard Application Readiness card, and Application Readiness navigation.

## Limitations

This tracker records only the stage the user selects. It does not submit applications, store files, verify identity, or approve government benefits. Users must still apply on the official scheme source.
