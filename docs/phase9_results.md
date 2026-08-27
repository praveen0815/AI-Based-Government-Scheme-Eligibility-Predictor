# Phase 9 results

Date: **2026-08-14**.

## 1. Phase objective

Implement the first real **Unified Socio-Economic Data Wallet** using PostgreSQL and FastAPI.

The wallet is a centralized representation of a citizen's socio-economic attributes. The stored profile can be reused by the eligibility prediction and scheme recommendation engine without requiring the citizen to repeatedly enter the same information.

This is an academic prototype. It is **not** linked to Aadhaar, a government citizen database, or an official identity. Authentication is intentionally not implemented.

## 2. PostgreSQL setup

Local development used PostgreSQL 16. Connection settings come from `DATABASE_URL` (`postgresql+psycopg://...`). Host, username, password, and database name are not hard-coded.

Tables are created with `python -m app.db.init_db`, which runs SQLAlchemy `create_all` only. It does not drop existing tables. There is no Alembic migration tree in this project, so a second migration system was not added.

Automated wallet tests use a separate `scheme_predictor_test` database via `TEST_DATABASE_URL`. They never write to the application database.

## 3. Database schema

Table: `citizen_profiles`

| Column | Type |
| --- | --- |
| `id` | INTEGER primary key (internal only) |
| `citizen_id` | VARCHAR(36) unique UUID |
| `age` | INTEGER |
| `gender` | VARCHAR |
| `is_student` | BOOLEAN |
| `first_higher_education_course` | BOOLEAN |
| `school_background` | VARCHAR |
| `marital_status` | VARCHAR |
| `is_orphan` | BOOLEAN |
| `is_destitute` | BOOLEAN |
| `occupation_category` | VARCHAR |
| `wet_land_acres` | NUMERIC(10,2) |
| `dry_land_acres` | NUMERIC(10,2) |
| `created_at` | TIMESTAMPTZ |
| `updated_at` | TIMESTAMPTZ |

Check constraints enforce the CORE vocabulary from `ml/src/ml_config.py`.

## 4. Data wallet design

See `docs/data_wallet_design.md`.

The wallet stores citizen socio-economic information only. Eligibility, probabilities, and explanations are computed on demand by the existing recommendation service.

Synthetic ML rows in `dataset/raw/citizens.csv` were **not** imported into PostgreSQL.

## 5. CRUD APIs

| Method | Path | Status |
| --- | --- | --- |
| POST | `/api/v1/wallets` | 201 |
| GET | `/api/v1/wallets/{citizen_id}` | 200 |
| PUT | `/api/v1/wallets/{citizen_id}` | 200 |
| DELETE | `/api/v1/wallets/{citizen_id}` | 204 |

The server generates `citizen_id`. The client does not send it on create. The internal `id` column is not returned.

These routes are for local academic demonstration only. There is no login.

## 6. Recommendation-from-wallet API

`POST /api/v1/wallets/{citizen_id}/recommend` loads the wallet from PostgreSQL, converts it to the existing citizen feature dict, and calls `recommend_for_citizen`. The Decision Tree is still loaded once at startup.

Existing endpoints remain unchanged:

- `POST /api/v1/predict`
- `POST /api/v1/recommend`
- `GET /api/v1/schemes`

## 7. React wallet UI

Route: `/wallet`

- Reuses `CitizenForm` / `FormField` / `SelectField` / `BooleanField` (same fields as `/check`)
- Create → show generated citizen ID and summary
- Edit → preload values → `PUT`
- Find Eligible Schemes → `POST /api/v1/wallets/{citizen_id}/recommend` with no profile body
- Delete → confirmation, then return home
- Prototype notice: no login or authentication

## 8. Database validation

API validation (HTTP 422) and PostgreSQL check constraints both reject:

- age outside 0–120
- negative land
- categorical values outside `ml_config.py`

Invalid application values are not silently stored.

## 9. Security limitations

There is **no authentication and no authorization**. Knowing a `citizen_id` is enough to read, change, or delete that wallet.

Do not call this a secure account, private account, authenticated wallet, or government citizen account.

## 10. Test results

Backend (`python -m unittest discover -s tests -v`):

| | |
| --- | --- |
| Total | 50 |
| Passed | 49 |
| Failed | 0 |
| Skipped | 1 |

The skipped test is `test_valid_create_without_test_database_returns_503`, which only runs when PostgreSQL is unavailable.

Frontend (`npm test`):

| | |
| --- | --- |
| Total | 31 |
| Passed | 31 |
| Failed | 0 |
| Skipped | 0 |

Frontend build (`npm run build`): **success**

Database: **connected** (`GET /health` returned `{"status":"ok","database":"connected"}`)

## 11. End-to-end test

Performed against PostgreSQL with the required Pudhumai-shaped profile (age 20, female, student, first higher-education course, `government_6_to_12`, never married, not orphan/destitute, occupation other, land 0/0):

1. Created wallet → received `citizen_id` `f9d5d3b1-cc98-4f3f-9ef8-ed2a7aae010f`
2. Retrieved wallet → stored values matched
3. Recommended from wallet only → 1 eligible scheme: `TN-SW-001`
4. Updated gender to `male`
5. Recommended again → 1 eligible scheme: `TN-SW-002` (Pudhumai Penn no longer recommended)
6. Deleted wallet → subsequent GET returned 404

The ML dataset was not modified.

React wallet flows (create, validate, edit, delete confirmation, recommend-from-wallet, 404, API error, prototype warning) are covered by Vitest.

## 12. Files created

- `backend/app/db/__init__.py`
- `backend/app/db/base.py`
- `backend/app/db/session.py`
- `backend/app/db/init_db.py`
- `backend/app/models/__init__.py`
- `backend/app/models/citizen.py`
- `backend/app/schemas/wallet.py`
- `backend/app/services/wallet_service.py`
- `backend/app/routes/wallet.py`
- `backend/tests/test_wallet_api.py`
- `backend/.env.example`
- `docs/data_wallet_design.md`
- `docs/phase9_results.md`
- `frontend/src/pages/WalletPage.tsx`
- `frontend/src/components/CitizenForm.tsx`
- `frontend/src/utils/walletStorage.ts`
- `frontend/src/utils/displayLabels.ts`
- `frontend/src/test/wallet.test.tsx`

## 13. Files modified

- `backend/requirements.txt`
- `backend/app/main.py`
- `backend/app/cors.py`
- `backend/tests/test_prediction_api.py`
- `backend/README.md`
- `.env.example`
- `README.md`
- `docs/api_design.md`
- `docs/README.md`
- `frontend/src/App.tsx`
- `frontend/src/pages/CheckPage.tsx`
- `frontend/src/pages/HomePage.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/types/api.ts`
- `frontend/README.md`

## 14. Known limitations

- No authentication, authorization, or identity verification
- Anyone who knows a `citizen_id` can access that wallet
- Local PostgreSQL only; no cloud database
- Synthetic training citizens are not application wallet records
- Predictions remain research-prototype outputs, not government approval
- Wallet database tests skip if `TEST_DATABASE_URL` is unset

## 15. Recommended Phase 10

Add authentication and authorization for wallet access (login, registration, and protected wallet routes).

Do **not** start Phase 10 until approved.

Still out of scope after Phase 9: JWT/OTP implementation in this phase, LLM/chatbot, model retraining, new schemes, deployment, and government API integration.
