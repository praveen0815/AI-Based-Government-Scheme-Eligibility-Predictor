# Security hardening

This document describes the Phase 21 security posture of the SchemeWise academic prototype. It is not a government security certification and does not claim production deployment readiness by itself.

Authentication protects application-account ownership only. It is not Aadhaar, OTP, or government identity verification.

## Authentication security

### Implemented

- Email/password accounts hash passwords with **pwdlib / Argon2**. Plain-text passwords are never stored, logged, or returned.
- Google Sign-In is verified **server-side** with `google.oauth2.id_token`. The frontend only forwards the Google ID token once. Google ID/access tokens are not stored.
- The backend issues the same application JWT used before Phase 21. Payload remains `{ "sub": "<user_id>", "exp": "<expiration>" }`.
- `JWT_SECRET_KEY`, `JWT_ALGORITHM`, and `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` come from environment variables.
- Production (`APP_ENV=production`) rejects empty, short, or known academic-default JWT secrets.
- Invalid or expired JWTs return HTTP 401. There is no refresh-token flow.
- `get_current_user` is the only ownership source for authenticated routes. Client-supplied user IDs are ignored.

### Recommended for future deployment infrastructure

- Rotate JWT secrets with a documented operational process.
- Put the API behind a TLS-terminating reverse proxy.
- Consider a hardware-backed or secret-manager-hosted JWT secret.

## Account ownership

### Implemented

Authenticated routes load the wallet, history, comparison input, PDF report, and account profile from the JWT subject:

- Wallet create/read/update/delete and wallet recommend
- History list/read/delete
- Compare and recommendation PDF
- `GET/PATCH/DELETE /api/v1/auth/me` and password change

A caller who names another user's wallet or history ID receives HTTP **404**, not 403, to avoid resource enumeration.

Account deletion removes the user row and that user's wallet and recommendation history. Global schemes, datasets, models, and evaluation artifacts are not deleted.

### Recommended for future deployment infrastructure

- Periodic access-control tests in CI against a dedicated staging database.
- Object-level audit logs for account deletion, if a college or lab deployment requires them.

## Input validation

### Implemented

- Pydantic request models reject invalid types, out-of-range numbers, and values outside the existing CORE vocabulary.
- Scheme IDs on predict/compare/report requests remain CORE literals.
- Clients cannot submit eligibility labels or override prediction fields. Comparison and PDF routes recompute hybrid Rule + ML results on the server.
- Auth strings have length limits. Google credentials are capped so oversized tokens are rejected.
- HTTP 422 responses omit submitted field values so passwords and tokens are not echoed.

### Recommended for future deployment infrastructure

- Request-body size limits at the reverse proxy.
- WAF rules for abusive traffic patterns.

## Database safety

### Implemented

- PostgreSQL access uses SQLAlchemy with parameterized filters. User input is not interpolated into SQL strings.
- Sessions are opened per request and closed in `get_db`.
- Operational/database errors are mapped to safe HTTP 503 or 500 messages. SQL, connection strings, and stack traces are not returned to clients.
- Health checks use `SELECT 1` only on `/health`, not on every API request.

### Recommended for future deployment infrastructure

- Managed PostgreSQL with automated backups and least-privilege roles.
- Separate credentials for the application role and administrative migrations.

## CORS

### Implemented

- Origins are never `*`.
- Development continues to allow `http://localhost:5173` and `http://127.0.0.1:5173`.
- Production requires `CORS_ALLOWED_ORIGINS` (comma-separated). A wildcard value is rejected at startup.
- `allow_credentials` remains false. The JWT is sent in the `Authorization` header.
- `PATCH` is allowed so account profile updates work from the Vite origin.

### Recommended for future deployment infrastructure

- Pin production origins to the exact HTTPS frontend hostnames.

## Security headers

### Implemented

FastAPI middleware adds:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- A strict `Content-Security-Policy` on API responses
- A Swagger-compatible CSP on `/docs`, `/redoc`, and `/openapi.json`
- `Cache-Control: no-store` on responses to requests that include `Authorization`

### Recommended for future deployment infrastructure

- Frontend hosting CSP and HTTPS HSTS at the reverse proxy or static host.
- Do not add a backend CSP that blocks Google Identity Services on the Vite app; Google Sign-In runs in the browser.

## Rate limiting

### Implemented

An in-process sliding window can limit `POST /api/v1/auth/login`, `/register`, and `/google`. It is enabled in production by default and disabled during automated tests so existing suites stay reliable.

This limiter is per Python process. It is not shared across workers or machines.

### Recommended for future deployment infrastructure

- Edge or API-gateway rate limiting (or Redis) before a multi-worker / multi-host deployment.
- Account lockout and abuse monitoring if the prototype is exposed beyond a lab network.

Do **not** add Redis solely for this academic prototype.

## Environment configuration

### Implemented

Configuration-driven values:

- `APP_ENV` (`development` default, `production` for shared deployments)
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `GOOGLE_CLIENT_ID`
- `CORS_ALLOWED_ORIGINS`
- `VITE_API_BASE_URL`
- `VITE_GOOGLE_CLIENT_ID`

`.env` files are gitignored. Examples use placeholders only. Startup logs never print secret values.

Production startup fails if the database URL, a strong JWT secret, Google client ID, or CORS origins are missing.

Development still supports localhost, 127.0.0.1, Swagger, and Vite. Swagger is disabled when `APP_ENV=production`.

### Recommended for future deployment infrastructure

- Inject secrets from a vault or the host environment. Do not copy production `.env` files into images.
- Build the frontend with an explicit `VITE_API_BASE_URL` for the deployed API origin.

## Logging policy

### Implemented

- Application logs do not record passwords, JWTs, Google tokens, password hashes, or authorization headers.
- A redacting log filter replaces bearer tokens and PostgreSQL credential URLs with `[REDACTED]`.
- Unexpected database and unhandled errors are logged server-side and returned as generic client messages.

### Recommended for future deployment infrastructure

- Centralized logs with retention and access control.
- Disable verbose access logs that might capture query strings if any future endpoint puts tokens in URLs. Current routes do not put JWTs in URLs.

## Sensitive responses

### Implemented

Public user objects include `user_id`, `full_name`, `email`, `has_password`, `has_google`, and `created_at` only. They do not include `password_hash` or `google_sub`.

The frontend session copy stores only those public fields plus the application JWT in `sessionStorage`. Google credentials are not persisted.

Public evaluation and scheme catalog APIs remain public and continue to expose only intended research/catalog data.

### Recommended for future deployment infrastructure

- Review whether `user_id` should remain in browser storage for a later non-academic deployment. Removing it would be a contract change and is out of scope here.

## Frontend security

### Implemented

- JWT is sent as `Authorization: Bearer` and stored in the existing `sessionStorage` keys.
- JWTs are not placed in URLs.
- API errors are mapped to existing i18n messages. Raw backend exception text is not displayed.
- Google Identity Services credentials are forwarded to `POST /api/v1/auth/google` and then discarded.
- Protected React routes still use `AuthContext` / `ProtectedRoute`.

### Recommended for future deployment infrastructure

- `httpOnly` cookies and CSRF protections if the token transport model is ever changed. That would be a new authentication design, not a drop-in change.

## Remaining production risks

These are **not** claimed to be solved by Phase 21:

- No TLS, hosting, or container hardening is provided in-repo.
- In-process rate limiting is not cluster-safe.
- Public `/predict` and `/recommend` remain unauthenticated research endpoints and can be called without a wallet.
- Swagger is available in development and must stay disabled in production.
- `sessionStorage` can be read by JavaScript on the same origin. XSS on the frontend would expose the JWT.
- Dependencies were reviewed; no large upgrade was performed in this phase.
