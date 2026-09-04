# Advanced scheme search and filtering

This phase adds catalog search and filters on `/schemes`. It reads the existing `schemes.csv` records only. It does not score eligibility or change documented scheme conditions.

> This catalog search lists research-prototype scheme records only. It does not predict eligibility or change documented scheme conditions.

## Architecture

```text
React /schemes  -->  GET /api/v1/catalog  (all 13 official rows)
                -->  client-side name/ID search and exact catalog filters

GET /api/v1/schemes remains the 6 CORE schemes used by predict/recommend.
```

The Decision Tree, eligibility rules, hybrid ranking, wallet, history, comparison, PDF, documents, readiness, insights, notifications, Google authentication, datasets, and existing API contracts are unchanged.

## Filters

Values come from the catalog. Empty cells are offered as **Not specified in catalog**.

| Filter | Catalog field |
| --- | --- |
| Search | `scheme_name` or `scheme_id` |
| CORE status | `ml_scope` (`CORE`, `ADVANCED`, `HOLD`) |
| Department | `department` |
| Gender | `gender_requirement` |
| Student status | `student_status_requirement` |
| Benefit / type | `scheme_category` |

Clear Filters resets search and every select. The page shows a result count and a **No schemes found** empty state.

## Frontend

Desktop: sticky filter panel and scheme grid. Mobile: Filters button opens a drawer. Cards keep official names, IDs, CORE/ADVANCED/HOLD badges, benefit text, **View Details**, and **Official Source**.
