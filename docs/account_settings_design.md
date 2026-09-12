# Account and profile management

This phase adds a dedicated settings surface for the authenticated research-prototype account. It reuses the existing JWT owner, `/api/v1/auth/me`, password-change, account-delete, and wallet completeness APIs. It does not add OTP, email verification, 2FA, payment, Aadhaar verification, or an external account-management service.

> This page manages the SchemeWise research prototype account. It is not a government identity profile.

## Architecture

```text
React /settings               -->  GET/PATCH/DELETE /api/v1/auth/me
                              -->  POST /api/v1/auth/change-password
                              -->  GET /api/v1/wallets/me/completeness
JWT owner only                -->  auth_service / existing wallet completeness
```

The Decision Tree, eligibility rules, hybrid ranking, wallet ownership, Google authentication flow, JWT implementation, history, comparison, PDF, documents, readiness, insights, notifications, catalog, datasets, and existing API contracts are unchanged.

`/settings` is the single Account & Settings page. There is no `/account` route and no second wallet or profile store.

## What the owner can do

| Area | Behaviour |
| --- | --- |
| Profile | Edit `full_name` through `PATCH /api/v1/auth/me`. Email is shown and cannot be edited here. |
| Account type | Shown from existing `has_password` / `has_google`. No `auth_provider` field is added. |
| Password | Password accounts use current + new + confirmation. Google-only accounts see that password login is managed through Google and do not get a change form. |
| Wallet | Links to My Wallet / Edit Profile (`/wallet`) and shows the existing completeness API when a wallet exists. |
| Delete | Confirm, then `DELETE /api/v1/auth/me` removes only that owner's account and owned rows. The session is cleared and the browser returns home. |

The UI never displays or stores passwords, JWTs, Google tokens, `password_hash`, `google_sub`, or identity numbers.

## Existing APIs (unchanged)

- `GET /api/v1/auth/me` — public user fields only
- `PATCH /api/v1/auth/me` — `{ "full_name": "..." }`
- `POST /api/v1/auth/change-password` — current and new password; 204
- `DELETE /api/v1/auth/me` — 204; owner cascade only
- `GET /api/v1/wallets/me/completeness` — existing completeness payload or 404

Account deletion still removes only the JWT owner's user row, wallet, history, document-checklist progress, readiness rows, uploads, and notifications. Scheme catalog, datasets, and research models are not deleted.

## Limitations

This is research-prototype account management only. It does not verify government identity, recover accounts by email, or change how sessions are issued.
