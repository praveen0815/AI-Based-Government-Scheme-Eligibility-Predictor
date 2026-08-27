# Phase 21 results — Security and production hardening

Date: **2026-08-22**.

Application Readiness tracking was added later on top of Phases 1–20. See `docs/application_readiness_design.md` and `docs/application_readiness_results.md`. This file remains the security-hardening record.

This phase hardens the existing SchemeWise backend and frontend. It does not add user-facing features. The Decision Tree, datasets, eligibility rules, hybrid ranking, wallet ownership rules, history, comparison, PDF generation, evaluation, i18n dictionaries, and Google verification flow were not redesigned.

## What changed

- Centralized environment settings in `backend/app/settings.py` with an explicit `APP_ENV` distinction.
- Production startup now requires `DATABASE_URL`, a strong `JWT_SECRET_KEY`, `GOOGLE_CLIENT_ID`, and `CORS_ALLOWED_ORIGINS`. Weak academic JWT defaults are rejected in production only.
- CORS remains an allowlist. `PATCH` was added so account updates work from Vite. Origins are never `*`. Credentials stay disabled.
- Security-header middleware adds `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and a CSP that still allows Swagger in development.
- Authenticated responses send `Cache-Control: no-store`.
- Validation errors no longer echo submitted values. Unhandled exceptions return a generic HTTP 500.
- An in-process rate limiter can protect login, register, and Google authentication in production. Tests keep it disabled. Redis was not added.
- Logs redact bearer tokens and database credential URLs. Startup logs never print secrets.
- `/health` still reports application and database status only, plus a non-secret `environment` label.
- The frontend still uses `sessionStorage` for the application JWT and now persists only public user fields. Google tokens are not stored. API 429 responses use the existing generic i18n error.

## Intentionally unchanged

- JWT payload contract (`sub`, `exp`) and login/register/Google response shape
- Wallet, history, compare, report, and account ownership rules
- Public `/predict`, `/recommend`, `/schemes`, and evaluation routes
- English/Tamil copy keys (no new user-facing strings)
- ML artifacts and PostgreSQL schema

## Testing

- Backend `tests.test_hardening` plus existing CORS, auth, Google, prediction, wallet, history, compare, report, and evaluation suites.
- Frontend account, auth, and dashboard tests after session-storage hardening.

## Implemented vs recommended

See `docs/security_hardening.md`.

Implemented in this repository: production config validation, safer errors, headers, CORS allowlists, log redaction, optional in-process auth rate limiting, and frontend secret stripping.

Recommended for a later deployment, not implemented here: TLS, a shared rate-limit/gateway layer, secret-manager injection, frontend hosting CSP/HSTS, and multi-worker Redis or edge limits.

## Limitations

This remains an academic prototype. Public research endpoints are still callable without authentication. The in-memory limiter is per process. `sessionStorage` is still readable by same-origin JavaScript. No Aadhaar, OTP, admin panel, chatbot, government API, or hosting stack was added.
