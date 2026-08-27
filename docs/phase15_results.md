# Phase 15 results — Scheme comparison and PDF report

Date: **2026-08-17**.

This phase adds CORE scheme comparison and an on-demand recommendation PDF. The model was not retrained. `citizens.csv`, `eligibility_dataset.csv`, and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, JWT authentication, and wallet ownership were not changed.

## What changed

- `POST /api/v1/compare` compares 2 or 3 CORE schemes for the authenticated user's wallet. Catalog fields come from `dataset/raw/schemes.csv`. Predictions are recomputed with the existing hybrid service.
- `POST /api/v1/reports/recommendations` returns a generated PDF. The file is not stored.
- The results page lets a signed-in user select up to three recommended schemes, open `/compare`, and download a report.
- Comparison copy uses `Predicted eligible` and never describes a non-recommended scheme as an official rejection.

## Testing

- Frontend `npm test`: 63 passed, including comparison selection, `/compare` backend load, and PDF download.
- Frontend `npm run build`: succeeded.
- Backend comparison service tests (no PostgreSQL): two CORE schemes, non-recommended wording, invalid selection.
- Backend PDF service tests (no PostgreSQL): `%PDF` header, project title metadata, no password hash or email.
- OpenAPI lists `/api/v1/compare` and `/api/v1/reports/recommendations`.
- Database tests skip unless `TEST_DATABASE_URL` is reachable, matching earlier wallet tests.

## Limitations

Comparison and PDF generation require a saved wallet. A public `/check` result is not used as the report source of truth. ADVANCED and HOLD schemes cannot be compared. The PDF is a research demonstration document only.
