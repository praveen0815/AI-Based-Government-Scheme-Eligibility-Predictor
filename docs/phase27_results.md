# Phase 27 results — Account and profile management

Date: **2026-09-04**.

This phase adds Account & Profile Management on top of Phases 1–26. The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, authentication, wallet ownership, Google login, JWT implementation, history, comparison, PDF, documents, readiness, insights, notifications, catalog, and existing API contracts were not changed.

## What changed

- Protected `/settings` is the single Account & Settings page. There is no `/account` duplicate.
- The page shows name, read-only email, account type (Email and password or Google), and account creation date.
- Full name can be edited through the existing `PATCH /api/v1/auth/me` contract.
- Password change remains available only for password-based accounts. Google-only accounts are told that password login is managed through Google.
- Settings links to My Wallet / Edit Profile and shows the existing completeness API. No second wallet or profile system was added.
- Delete Account still requires confirmation, removes only the authenticated owner's data, clears the session, and returns home.
- The authenticated sidebar, header, and profile chip use a single **Settings** item pointing to `/settings`.
- English/Tamil copy uses the existing `useI18n()` dictionaries.

## Testing

Frontend `npm test` covers protected `/settings`, a single Settings nav item, wallet/completeness links, Google-only password copy, name update, and delete confirmation. `/account` is not a second settings page.

## Limitations

This is research-prototype account management only. It does not add OTP, email verification, 2FA, payment, Aadhaar verification, or external account-recovery services.
