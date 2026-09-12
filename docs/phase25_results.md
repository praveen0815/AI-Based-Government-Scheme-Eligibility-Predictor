# Phase 25 results — Advanced scheme search and filtering

Date: **2026-09-04**.

This phase adds catalog search and filters on top of Phases 1–24. The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, JWT/Google authentication, wallet, history, comparison, PDF, documents, readiness, insights, notifications, and existing API contracts were not changed.

## What changed

- Additive public `GET /api/v1/catalog` returns all 13 official `schemes.csv` rows, with optional name/ID and exact-field filters.
- `GET /api/v1/schemes` still returns the six CORE schemes only.
- `/schemes` has a desktop filter panel, mobile filter drawer, Clear Filters, result count, and a No schemes found state.
- Cards show CORE/ADVANCED/HOLD from `ml_scope`, official catalog text, **View Details**, and **Official Source**.
- English/Tamil copy uses the existing `useI18n()` dictionaries.

## Testing

- Backend `python -m unittest tests.test_catalog_api -v`: **5 passed**. Catalog lists 13 rows; `/api/v1/schemes` remains 6 CORE schemes; name/ID and catalog-value filters work.
- Frontend `npm test`: **122 passed**, including catalog listing, ID search, CORE-status filter, clear, empty state, Tamil copy, existing catalog error, and View Details navigation.

## Limitations

This is a research-prototype catalog browser. It does not predict eligibility, invent scheme conditions, or replace official government portals.
