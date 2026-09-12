# Phase 35–38 results

Coordinated citizen-assistance enhancements on top of the existing hybrid Rule + ML prototype.

## What shipped

1. Explainable eligibility — decision summary, not-eligible list, incomplete-evaluation copy.
2. Eligibility simulator at `/eligibility-simulator` using public `/recommend` only.
3. User-side application tracking at `/applications` and `application_tracking`.
4. Personalized dashboard snapshot, recommended-for-you, and extra quick actions.
5. Research dashboard at `/research-dashboard` reusing Phase 29 metrics.
6. Advanced voice intents (what-if, documents, highest benefit, new navigation).
7. Smart notifications for incomplete evaluation and application tracking.
8. Unified sidebar / protected routes: Dashboard remains the authenticated entry.

## APIs

New, additive, owner-scoped:

- `GET|POST /api/v1/applications`
- `PATCH|DELETE /api/v1/applications/{application_id}`

Reused: recommend, wallet, completeness, history, catalog, documents, insights, readiness, notifications, system-evaluation, evaluation bundle, voice wallet recommend.

## Database

New table `application_tracking` (`user_id`, `scheme_id`, `status`, `application_date`). Unique `(user_id, scheme_id)`. Removed on account delete.

## Security

No JWT/Google/password exposure. Simulation does not PUT the wallet. Application rows are owner-scoped. Research dashboard is protected and labeled as a prototype, not an admin console.

## Testing

Frontend: `npm test` — 24 files, 186 tests passed, including explainability, simulator, applications, dashboard, research dashboard, voice, and notifications.

Backend: `python -m unittest discover -s tests -q` from `backend/.venv` — 171 tests; 1 disclaimer assertion was fixed. Ownership tests skip unless `TEST_DATABASE_URL` and PostgreSQL are available. System Python 3.13 is not the project interpreter.

## Limitations

- No second eligibility engine.
- No income/state wallet fields.
- No government application submission.
- No invented catalog deadlines.
- No admin role system.
- Voice matching remains keyword-based.
