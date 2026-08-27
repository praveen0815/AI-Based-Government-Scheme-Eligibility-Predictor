# Document checklist and application preparation

Phase 19 extends SchemeWise from eligibility discovery into **application preparation**. Authenticated users can review a checklist for CORE schemes that this prototype has already recommended to them, and they can mark their own preparation status.

This is a research prototype. Document preparation progress is **not** government approval, official verification, or a guarantee of eligibility.

## Architecture

```text
React /documents  -->  GET/PATCH /api/v1/documents*
JWT owner only    -->  document_checklist_service
                      |-- recommendation_history (which CORE IDs the user may see)
                      |-- schemes.csv catalog (required_documents text only)
                      '-- document_checklist_progress (status rows)
```

The Decision Tree, eligibility rules, hybrid ranking, wallet schema, history schema, comparison, PDF, Google authentication, and existing public API contracts are unchanged.

Frontend route: `/documents` (protected). Dashboard `/dashboard` shows a compact Application Preparation summary and a **Manage Documents** link.

## Catalog sources

Checklist labels come only from project catalog data:

- `dataset/raw/schemes.csv` column `required_documents`
- Official source URL already stored on the scheme row

The parser splits verified lists on `;` or newlines. It does **not** invent identity proof, income certificates, caste certificates, bank details, or other documents when the catalog does not list them.

If `required_documents` is empty or the literal `NEEDS VERIFICATION`, the API sets `documents_need_verification=true` and the UI shows:

> Document requirements need verification from the official scheme source.

Current CORE catalog rows use `NEEDS VERIFICATION`. No official document list is fabricated for those schemes.

A single **project reminder** item is always included:

- `item_key`: `official-source-review`
- Source: `project_reminder` (not an official document requirement)
- Label: confirm the current document list on the official scheme source

That reminder is a preparation helper. It is not a government-issued document.

## Database ownership

Table: `document_checklist_progress`

| Column | Notes |
| --- | --- |
| `id` | Server UUID |
| `user_id` | FK to `users.id`, `ON DELETE CASCADE`. Taken from the JWT, never from the client body |
| `scheme_id` | CORE scheme ID |
| `item_key` | Checklist key from the catalog parser or the project reminder |
| `status` | `not_started`, `ready`, or `needs_verification` |
| `created_at`, `updated_at` | Timestamps |

Unique constraint: `(user_id, scheme_id, item_key)`.

GET endpoints do not insert rows. A row is created only when the owner PATCHes a status. Schemes that have never appeared in the caller's recommendation history are not listed and cannot be updated.

Account deletion removes the owner's checklist rows together with wallet and history. Scheme catalog, datasets, and models are not deleted.

## Checklist status flow

Allowed statuses:

| Stored value | UI label |
| --- | --- |
| `not_started` | Not Started |
| `ready` | Ready |
| `needs_verification` | Needs Verification |

A user may move an item between these three values at any time. The API rejects other words such as `approved` or `government_verified`.

## Progress calculation

Document preparation progress is checklist completion only:

```text
progress_percent = round(ready_count / item_count * 100)
```

Example: 4 of 5 items marked Ready = 80%.

Needs Verification and Not Started do not count as Ready. The UI labels this **Document preparation progress**, never eligibility probability or government approval.

Dashboard **schemes with checklist progress** counts schemes that have at least one saved row. Overall percent uses Ready items across recommended CORE schemes that the history gate already allows.

## APIs

JWT required. A caller can only read or update their own rows.

| Method | Path |
| --- | --- |
| GET | `/api/v1/documents` |
| GET | `/api/v1/documents/schemes/{scheme_id}` |
| PATCH | `/api/v1/documents/schemes/{scheme_id}/items/{item_key}` |

PATCH body: `{ "status": "ready" }`.

## Data safety limitations

This phase does **not** implement:

- File uploads or document storage
- Aadhaar or other identity-number capture
- OTP or government identity verification
- Government API integration
- Application submission

Stored data is preparation status only.

## Document preparation vs government approval

| This prototype | Official process |
| --- | --- |
| Research checklist from catalog text | Final document list on the government website |
| User-marked Ready / Needs Verification / Not Started | Department scrutiny of submitted papers |
| Preparation percentage | Eligibility decision or sanction |

Users must verify the final requirements on the official scheme source before applying. SchemeWise does not approve applications.
