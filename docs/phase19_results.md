# Phase 19 results — Smart document checklist and application preparation

Date: **2026-08-24**.

This phase adds an authenticated document-preparation checklist on top of Phases 1–18. The Decision Tree was not retrained. `citizens.csv`, `eligibility_dataset.csv`, and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, JWT and Google authentication, wallet ownership, history, comparison, PDF generation, and Tamil/English i18n architecture were not changed except for new checklist copy and a dashboard summary card.

## What changed

- PostgreSQL table `document_checklist_progress` stores `user_id`, `scheme_id`, `item_key`, preparation status, and timestamps only.
- Authenticated APIs:
  - `GET /api/v1/documents`
  - `GET /api/v1/documents/schemes/{scheme_id}`
  - `PATCH /api/v1/documents/schemes/{scheme_id}/items/{item_key}`
- Checklist items are parsed from catalog `required_documents`. The current CORE catalog values are `NEEDS VERIFICATION`, so the API does not invent official document names. The UI states that requirements need verification from the official scheme source.
- A project reminder item lets the user record that they reviewed the official source. That reminder is not treated as a government document.
- Status values are **Not Started**, **Ready**, and **Needs Verification**. Progress is `ready / total` and is labeled **Document preparation progress**.
- Frontend route `/documents` and sidebar/header **Documents** navigation.
- Dashboard **Application Preparation** card: schemes with saved checklist progress, overall preparation percent, and **Manage Documents**.
- Account deletion also removes the owner's checklist rows.

## What was not built

File uploads, Aadhaar capture, OTP, government document APIs, application filing, and Phase 20-style advanced eligibility insights.

## Testing

- Backend `python -m unittest tests.test_documents_api -v`: **10 passed**. Unauthenticated routes return HTTP 401; OpenAPI lists the three paths; catalog parser leaves `NEEDS VERIFICATION` empty. Database tests: history-gated 404 for schemes never recommended to the caller; GET does not insert rows; PATCH Ready on the reminder item yields 100% for that scheme; another user receives 404; account delete removes progress rows.
- Frontend `npm test`: **96 passed**, including document-page redirect/empty/status tests and dashboard Application Preparation + Manage Documents.

## Limitations

CORE `required_documents` cells are not verified official lists. Users must confirm documents on the government website. Preparation progress is a personal tracking aid, not an eligibility score and not government approval.
