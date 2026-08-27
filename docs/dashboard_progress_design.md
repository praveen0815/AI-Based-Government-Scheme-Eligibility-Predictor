# Personalized progress and activity dashboard

This phase upgrades authenticated `/dashboard` into a unified progress view. It reads the caller's existing wallet, recommendation history, document checklist, and application-readiness rows. It does not score eligibility or submit government applications.

## Architecture

```text
React /dashboard  -->  existing wallet / history / documents / readiness APIs
                  -->  GET /api/v1/dashboard  (owner-only aggregation)
JWT owner only    -->  dashboard_service
                      |-- citizen_profiles (wallet present + completeness)
                      |-- recommendation_history
                      |-- document_checklist_progress
                      '-- application_readiness
```

The Decision Tree, eligibility rules, hybrid ranking, wallet ownership, history writes, document and readiness contracts, comparison, PDF, insights, Google authentication, datasets, and existing public APIs are unchanged.

`GET /api/v1/dashboard` is additive. The page still loads the existing owner-only APIs so Phase 1–21 cards keep working if the new route is unavailable.

## Progress overview

| Card | Source |
| --- | --- |
| Profile completeness % | Existing completeness calculation on the owned wallet |
| Eligibility check | Latest recommendation-history count |
| Document preparation % | Existing `GET /api/v1/documents` overall percent |
| Application readiness % | Existing `GET /api/v1/readiness` overall percent |

Percentages are preparation or completeness measures only. They are not eligibility probability or government approval.

## Citizen journey

The timeline is derived from owned data:

1. Profile Created — a wallet exists
2. Profile Completed — completeness is 100%
3. Eligibility Checked — at least one history row exists
4. Schemes Recommended — at least one CORE scheme appears in history
5. Documents Prepared — at least one checklist row is saved
6. Application Readiness — at least one readiness stage other than Not Started is saved

The first unreached step is **Current**. Later steps are **Pending**. Reached steps are **Completed**. Completed does not mean a government application was submitted or approved.

## Recent activity

Activity is merged from existing owner rows and sorted by timestamp:

| Kind | Source |
| --- | --- |
| `recommendation` | Recommendation history `checked_at` |
| `document` | Latest `updated_at` per recommended scheme in `document_checklist_progress` |
| `readiness` | Saved readiness `updated_at` |

The document list API does not expose timestamps, which is why the dashboard aggregator reads the owner's checklist rows directly. Another user never sees these rows.

## Smart summary

| Metric | Meaning |
| --- | --- |
| Total recommended schemes | Distinct CORE IDs across the caller's history |
| Schemes being prepared | Readiness rows whose stage is not `not_started` |
| Schemes with document progress | Recommended schemes that have a saved checklist row |
| Overall preparation progress | Average of document and readiness percents when recommended schemes exist; otherwise 0 |

Quick actions: Check Eligibility, My Wallet, View Insights, Manage Documents, Manage Readiness, View History.

## API

JWT required.

| Method | Path |
| --- | --- |
| GET | `/api/v1/dashboard` |

A missing wallet returns HTTP 200 with empty progress, not 404. GET does not insert wallet, history, document, or readiness rows.

## Data safety limitations

This phase does **not** implement:

- New ML models or LLMs
- Government APIs, Aadhaar, OTP, or payments
- Application submission
- New user roles

Stored data is unchanged. The dashboard only reads the caller's existing rows.
