# Application readiness tracker

This phase adds a **manual preparation journey** for CORE schemes that SchemeWise has already recommended. Authenticated users can record where they are in their own preparation. The tracker is not a government application, submission, or approval.

> Completed Preparation does not mean the government application was submitted or approved.

## Architecture

```text
React /readiness  -->  GET/PATCH /api/v1/readiness*
JWT owner only    -->  readiness_service
                      |-- recommendation_history (which CORE IDs the user may see)
                      |-- schemes.csv catalog (name + official source URL)
                      '-- application_readiness (one stage row per owner + scheme)
```

The Decision Tree, eligibility rules, hybrid ranking, wallet schema, history schema, comparison, PDF, document checklist, insights, Google authentication, datasets, and existing public API contracts are unchanged.

Frontend route: `/readiness` (protected). Authenticated sidebar and header show **Application Readiness**. Dashboard `/dashboard` shows a compact Application Readiness summary and a **Manage Readiness** link.

## Stages

Users may move a scheme between these six values at any time:

| Stored value | UI label |
| --- | --- |
| `not_started` | Not Started |
| `profile_ready` | Profile Ready |
| `documents_in_progress` | Documents In Progress |
| `ready_to_apply` | Ready to Apply |
| `official_source_visited` | Official Source Visited |
| `completed_preparation` | Completed Preparation |

The API rejects other words such as `government_submitted` or `approved`.

## Database ownership

Table: `application_readiness`

| Column | Notes |
| --- | --- |
| `id` | Server UUID |
| `user_id` | FK to `users.id`, `ON DELETE CASCADE`. Taken from the JWT, never from the client body |
| `scheme_id` | CORE scheme ID |
| `stage` | One of the six stored values above |
| `created_at`, `updated_at` | Timestamps |

Unique constraint: `(user_id, scheme_id)`.

GET endpoints do not insert rows. A row is created only when the owner PATCHes a stage. Schemes that have never appeared in the caller's recommendation history are not listed and cannot be updated. Another user receives HTTP 404 for the same scheme ID.

Account deletion removes the owner's readiness rows together with wallet, history, and document-checklist progress. Scheme catalog, datasets, and models are not deleted.

## Progress calculation

Preparation progress is a stage-index percentage only. It is not eligibility probability or government approval.

```text
progress_percent = round(stage_index / 5 * 100)
```

| Stage | Index | Percent |
| --- | --- | --- |
| Not Started | 0 | 0% |
| Profile Ready | 1 | 20% |
| Documents In Progress | 2 | 40% |
| Ready to Apply | 3 | 60% |
| Official Source Visited | 4 | 80% |
| Completed Preparation | 5 | 100% |

Dashboard **schemes being prepared** counts recommended CORE schemes that have a saved row whose stage is not `not_started`. **Overall preparation progress** is the average of those schemes' percents, or 0 when none have been started.

## APIs

JWT required. A caller can only read or update their own rows.

| Method | Path |
| --- | --- |
| GET | `/api/v1/readiness` |
| GET | `/api/v1/readiness/schemes/{scheme_id}` |
| PATCH | `/api/v1/readiness/schemes/{scheme_id}` |

PATCH body: `{ "stage": "documents_in_progress" }`.

## Frontend page

The `/readiness` page shows one card per recommended CORE scheme:

- Current stage and percent
- Visual timeline of the six stages
- Buttons to update the stage
- Link to Document Preparation (`/documents?scheme=...`)
- Official scheme source link when the catalog has a URL
- The Completed Preparation disclaimer

## Data safety limitations

This phase does **not** implement:

- Government application submission
- Government APIs
- Aadhaar, OTP, or identity verification
- Payments
- File uploads or document storage
- New ML models or LLMs

Stored data is the selected stage only.

## Application readiness vs official process

| This prototype | Official process |
| --- | --- |
| Manual stage selected by the user | Department receipt of an application |
| Completed Preparation | Submitted or approved government application |
| Preparation percentage | Eligibility decision or sanction |

Users must still apply on the official scheme source. SchemeWise does not submit or approve applications.
