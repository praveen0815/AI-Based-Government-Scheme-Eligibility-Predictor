# Phase 10 results

Date: **2026-08-14**.

## 1. Phase objective

Add authentication and secure wallet ownership to the Unified Socio-Economic Data Wallet.

This authentication system is implemented for the academic research prototype. It is not a government identity verification system.

## 2. Database changes

New table `users`:

| Column | Type |
| --- | --- |
| `id` | VARCHAR(36) UUID primary key |
| `email` | VARCHAR(255) unique, stored lowercased |
| `password_hash` | VARCHAR(255) Argon2 hash |
| `full_name` | VARCHAR(200) |
| `created_at` | TIMESTAMPTZ |
| `updated_at` | TIMESTAMPTZ |

`citizen_profiles.user_id` was added as a nullable unique foreign key to `users.id`. `citizen_id` is unchanged. Eligibility results are still not stored.

Alembic is not used in this project. `python -m app.db.init_db` runs `create_all` and then a safe `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` so existing Phase 9 wallets are not dropped. Orphan wallets with `user_id IS NULL` cannot be read through the authenticated API (HTTP 404).

## 3. Authentication architecture

Register → login → JWT (`sub` = user id) → `Authorization: Bearer` → `get_current_user` → owned wallet.

Passwords are hashed with pwdlib/Argon2. Tokens are created and verified with PyJWT HS256.

## 4. New API endpoints

| Method | Path |
| --- | --- |
| POST | `/api/v1/auth/register` |
| POST | `/api/v1/auth/login` |
| GET | `/api/v1/auth/me` |
| GET | `/api/v1/wallets/me` |

## 5. Protected endpoints

All wallet routes require a JWT. A caller can only access their own wallet. Cross-user access returns 404.

`/predict`, `/recommend`, `/schemes`, `/health`, and `/model-info` stay public.

## 6. React changes

- `/login` and `/register`
- Protected `/wallet` (unauthenticated users go to `/login`)
- `AuthContext` with sessionStorage persistence
- Header: Login/Register vs My Wallet/Logout
- Wallet page loads `GET /wallets/me` instead of asking for a citizen ID

## 7. Security measures

- No plain-text password storage
- No password hashes in responses
- JWT secret from environment
- JWT not placed in URLs
- `user_id` is not accepted from the client for ownership
- `citizen_id` is not treated as authentication
- Cross-user wallet access returns 404
- CORS remains the local Vite allowlist; `Authorization` is an allowed header; credentials are not enabled

## 8. Test results

Backend (`python -m unittest discover -s tests -v`):

| | |
| --- | --- |
| Total | 70 |
| Passed | 70 |
| Failed | 0 |
| Skipped | 0 |

Frontend (`npm test`):

| | |
| --- | --- |
| Total | 42 |
| Passed | 42 |
| Failed | 0 |
| Skipped | 0 |

## 9. Build result

`npm run build`: **success**

## 10. Migration result

`python -m app.db.init_db` created `users` and added `citizen_profiles.user_id` without dropping existing tables. The same helper runs in the test database setup.

## 11. End-to-end authentication flow

1. Registered User A and logged in → JWT issued
2. Created wallet → viewed via `/wallets/me`
3. Recommended from wallet → `TN-SW-001`
4. Updated gender to male → recommendation became `TN-SW-002`
5. User B could not read User A's wallet (404)
6. Request without token → 401
7. User A deleted the wallet

## 12. Known limitations

- Academic email/password only; no government identity
- No refresh tokens, email verification, or account recovery
- sessionStorage is convenient, not a secure vault
- JWT secret must be replaced for any shared environment
- Phase 9 orphan wallets are inaccessible until manually reassigned (not done automatically)

## 13. Files created

- `backend/app/models/user.py`
- `backend/app/schemas/auth.py`
- `backend/app/services/password_service.py`
- `backend/app/services/token_service.py`
- `backend/app/services/auth_service.py`
- `backend/app/deps.py`
- `backend/app/routes/auth.py`
- `backend/tests/test_auth_api.py`
- `frontend/src/context/AuthContext.tsx`
- `frontend/src/pages/LoginPage.tsx`
- `frontend/src/pages/RegisterPage.tsx`
- `frontend/src/components/ProtectedRoute.tsx`
- `frontend/src/utils/authStorage.ts`
- `frontend/src/test/auth.test.tsx`
- `docs/authentication_design.md`
- `docs/phase10_results.md`

## 14. Files modified

- `backend/requirements.txt`
- `backend/app/main.py`
- `backend/app/cors.py`
- `backend/app/models/citizen.py`
- `backend/app/models/__init__.py`
- `backend/app/services/wallet_service.py`
- `backend/app/routes/wallet.py`
- `backend/app/db/init_db.py`
- `backend/tests/test_wallet_api.py`
- `backend/README.md`
- `.env.example`
- `backend/.env.example`
- `README.md`
- `docs/api_design.md`
- `docs/data_wallet_design.md`
- `docs/README.md`
- `frontend/package.json`
- `frontend/src/App.tsx`
- `frontend/src/main.tsx`
- `frontend/src/components/Header.tsx`
- `frontend/src/pages/WalletPage.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/types/api.ts`
- `frontend/src/test/renderApp.tsx`
- `frontend/src/test/wallet.test.tsx`
- `frontend/README.md`

## 15. Recommended Phase 11

Wait for approval. A reasonable next academic step is role-based admin review of wallets, or richer account management (password change). Do not add Aadhaar, OTP, LLMs, or deployment unless explicitly requested.
