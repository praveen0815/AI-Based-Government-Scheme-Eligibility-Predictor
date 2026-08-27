# Unified Socio-Economic Data Wallet

The Unified Socio-Economic Data Wallet is a centralized representation of a citizen's socio-economic attributes. The stored profile can be reused by the eligibility prediction and scheme recommendation engine without requiring the citizen to repeatedly enter the same information.

This is an academic prototype. It is **not** linked to Aadhaar, a government citizen database, or an official identity.

## 1. Purpose

Store CORE citizen features in PostgreSQL so `POST /api/v1/wallets/{citizen_id}/recommend` can load the profile and call the existing recommendation service.

## 2. Database technology

- PostgreSQL
- SQLAlchemy 2.x
- psycopg 3 (`postgresql+psycopg://...`)

Connection settings come from `DATABASE_URL`. Host, username, password, and database name are not hard-coded.

## 3. Table structure

Table: `citizen_profiles`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | INTEGER PK | Internal only. Not returned by the API. |
| `citizen_id` | VARCHAR(36) unique | Server-generated internal wallet ID |
| `user_id` | VARCHAR(36) unique FK | Owner in `users.id`. Not accepted from the client. |
| `age` | INTEGER | 0–120 |
| `gender` | VARCHAR | Allowed vocabulary only |
| `is_student` | BOOLEAN | |
| `first_higher_education_course` | BOOLEAN | |
| `school_background` | VARCHAR | Allowed vocabulary only |
| `marital_status` | VARCHAR | Allowed vocabulary only |
| `is_orphan` | BOOLEAN | |
| `is_destitute` | BOOLEAN | |
| `occupation_category` | VARCHAR | Allowed vocabulary only |
| `wet_land_acres` | NUMERIC(10,2) | >= 0 |
| `dry_land_acres` | NUMERIC(10,2) | >= 0 |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

There are no columns for `eligible`, probabilities, or explanations.

## 4–6. Field definitions, types, and validation

Allowed categorical values are the same set as `docs/citizen_feature_specification.md` and `ml/src/ml_config.py`. The API rejects invalid values with HTTP 422. PostgreSQL check constraints also reject out-of-range age, negative land, and unknown categories.

## 7. CRUD operations

| Method | Path |
| --- | --- |
| POST | `/api/v1/wallets` (JWT) |
| GET | `/api/v1/wallets/me` (JWT) |
| GET | `/api/v1/wallets/{citizen_id}` (JWT, owner only) |
| PUT | `/api/v1/wallets/{citizen_id}` (JWT, owner only) |
| DELETE | `/api/v1/wallets/{citizen_id}` (JWT, owner only) |

## 8. Recommendation integration

`POST /api/v1/wallets/{citizen_id}/recommend` loads the wallet, converts it to the existing citizen feature dict, and calls `recommend_for_citizen`. The Decision Tree is still loaded once by the model service.

## 9. Security limitations

Wallet routes require a JWT. A user can only access the wallet whose `user_id` matches the token subject. Missing or foreign wallets return HTTP 404.

This authentication system is implemented for the academic research prototype. It is not a government identity verification system. See `docs/authentication_design.md`.

## 10. Why eligibility results are not stored

If rules or the model change later, stored eligibility would become stale. The wallet holds current socio-economic attributes. Recommendations are computed on demand.

## 11. Synthetic ML data vs application wallet data

| Store | Purpose |
| --- | --- |
| `dataset/raw/citizens.csv` and `eligibility_dataset.csv` | Training and evaluation of the Decision Tree |
| PostgreSQL `citizen_profiles` | Application data wallet for the portal |

The 5,000 synthetic citizens are **not** imported into PostgreSQL.
