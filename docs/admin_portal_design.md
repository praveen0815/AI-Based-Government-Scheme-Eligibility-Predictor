# Admin portal design

Phase 44 separates a professional **Admin Console** from the citizen User Portal. Administrators monitor users, documents, applications, the official catalog, and existing Hybrid Rule + ML results. The console is not a government operations system.

## Constraints

- The Hybrid Rule + ML engine remains the only eligibility authority.
- Admins cannot edit recommendation results, ranking, rules, or ML artifacts.
- Document review status is independent of eligibility.
- Existing JWT login is reused. Role checking is added; a second authentication system is not created.
- Passwords, password hashes, JWTs, Google tokens, and Aadhaar numbers are never returned or rendered.

## Authorization

`users.is_admin` is a boolean role flag (default false). Optional `ADMIN_EMAILS` lists bootstrap administrator emails. `get_current_admin` requires a valid Bearer JWT **and** `user_has_admin_access`.

| Caller | Admin APIs |
| --- | --- |
| Unauthenticated | **401** |
| Citizen JWT | **403** |
| Administrator | access granted |

The JWT payload stays `{ sub, exp }`. Role is read from the database (or bootstrap email list) on each request.

## APIs

All paths require `get_current_admin`. Contracts were not changed in the UI refinement:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/v1/admin/overview` | Counts, eligibility snapshot, recent activity |
| GET | `/api/v1/admin/users?q=` | Search name/email |
| GET | `/api/v1/admin/users/{user_id}` | Wallet, completeness, live recommend result, applications, history |
| GET | `/api/v1/admin/documents` | Uploads with owner and review status |
| PATCH | `/api/v1/admin/documents/{upload_id}` | `review_status` only: pending / verified / rejected |
| GET | `/api/v1/admin/eligibility` | Per-user evaluated schemes from the existing engine |

Eligibility views call the existing `recommend_for_citizen` on the saved wallet. They do not write history or the wallet.

Applications and Scheme Management in the console reuse existing APIs (`GET /admin/users`, `GET /admin/users/{id}`, `GET /api/v1/catalog`). Scheme Management is read-only.

## Database

Additive only:

- `users.is_admin BOOLEAN NOT NULL DEFAULT FALSE`
- `supporting_uploads.review_status VARCHAR(20) NOT NULL DEFAULT 'pending'`

`ensure_application_schema` applies both with `ADD COLUMN IF NOT EXISTS`.

## Frontend — Admin Console

Administrators on `/admin/*` receive a separate `AdminShell`: slate canvas, steel sidebar, compact header, KPI cards, filters, tables, and status badges. Citizen `AppShell` / `Sidebar` is unused in this chrome.

Sidebar contains only:

| Section | Destination |
| --- | --- |
| **Overview** | Admin Overview (`/admin`) |
| **Management** | Users, Document Verification, Applications, Scheme Management |
| **Analytics** | Eligibility Monitoring, Scheme Evaluation, System Evaluation, Research Dashboard |
| **Tools** | Notifications, Voice Assistant |
| **Account** | My Documents, Settings |

Citizen-only modules are not present: My Wallet / Vault, Check Eligibility, History, Compare, Simulator, Insights, and the citizen Dashboard.

Signed-in administrators land on `/admin`. Citizens still land on `/dashboard`. A single **Admin Portal** link remains on the citizen sidebar for administrators who need to switch consoles. Citizens never see that link.

English and Tamil copy lives in the existing dictionaries.

## Safety

- No admin file-download route.
- No microphone audio storage.
- Reviewing a document never flips a scheme to Eligible.
- Citizen routes, recommendation contracts, JWT implementation, and the Hybrid Rule + ML engine are unchanged.
