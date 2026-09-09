# Final system flow

Academic research prototype for Tamil Nadu CORE scheme eligibility prediction. This is not a government service and does not grant eligibility.

## Architecture

```text
React / Vite portal
        ↓
FastAPI
   ├── Public: /predict /recommend /schemes /catalog /evaluation /health
   └── JWT owner: wallet, history, compare, PDF, documents, readiness,
                  insights, notifications, settings, system-evaluation,
                  applications, simulator uses public /recommend only
        ↓
PostgreSQL  (users, citizen_profiles, history, checklist, readiness,
             uploads, notifications, application_tracking)
        ↓
Hybrid documented Rule Engine + saved Decision Tree
        ↓
CORE scheme recommendations + official catalog links
```

The Decision Tree artifact is `ml/models/baseline/decision_tree.joblib`. Datasets stay in `dataset/`. Existing API contracts are unchanged.

## Demo user flow

```text
Login or Google Sign-In
  → Dashboard
  → My Wallet / Edit Profile
  → Check Eligibility
  → Hybrid recommendations + Why this result?
  → History
  → Compare
  → PDF report
  → Documents
  → Application Readiness
  → Insights
  → Notifications
  → Voice Assistant (optional speech or typed requests; Phase 32/38 conversational UX)
  → Eligibility Simulator (temporary profile copy; labeled independent from the wallet; does not write the wallet)
  → Applications (user-side tracking only)
  → Schemes (search, filters, compare selection; Phase 33 discovery)
  → System Evaluation
  → Research Dashboard (Phase 29 metrics; research prototype label)
```

Signed-in users who open `/login` or `/register` are sent to `/dashboard`. Unauthenticated visits to protected pages go to `/login`. Expired JWTs are cleared on HTTP 401; this prototype does not refresh tokens. Opening Compare without two or three selected schemes shows an empty state instead of silently leaving the page.

Public pages remain available without a session: Home, Check Eligibility, Results (session recommendation only), Schemes, Evaluation, Login, and Register.

## Major modules

| Module | Role |
| --- | --- |
| Authentication | Email/password or Google ID token → application JWT |
| Data wallet | Owner-only socio-economic profile |
| Hybrid prediction | Documented rules + Decision Tree; rule is the reference on disagreement |
| Recommendation | Predicted-eligible CORE schemes ranked by existing hybrid logic |
| Explainability | Why this result? uses existing hybrid fields only; not-eligible and incomplete states |
| Simulator | Temporary profile copy scored by public `/recommend`; wallet is not written |
| Applications | Owner-only tracking statuses; no government submission |
| History | Saved recommendation checks for the JWT owner |
| Compare / PDF | Wallet-based comparison and on-demand research report |
| Documents / uploads | Preparation checklist and optional non-sensitive files |
| Readiness | Manual application-preparation stages |
| Insights | Personalized hybrid review of the saved wallet |
| Notifications | In-app reminders from profile, eligibility completeness, and application tracking |
| Voice assistant | Speech or typed intents over wallet, recommend, catalog, and navigation |
| Research dashboard | Protected Phase 29 / evaluation summary; not an admin console |
| Catalog search | Read-only search, filters, and sort over the 13 official scheme rows |
| Scheme discovery | Client-side search/filter/compare using the catalog plus an existing recommendation |
| Settings | Name, password (if any), completeness, owner-only delete |
| System evaluation | Saved ML metrics plus live in-process API timings |

## Technologies

- Python 3.12, FastAPI, SQLAlchemy, PostgreSQL, pwdlib/Argon2, google-auth
- Scikit-learn Decision Tree artifact (not retrained in later phases)
- React, TypeScript, Vite, Tailwind CSS, English/Tamil i18n

## Security notes

- Protected frontend routes use `ProtectedRoute` and redirect to Login.
- Protected APIs use `get_current_user`. Another user's wallet, history, document, readiness, upload, notification, or application ID returns HTTP 404.
- Passwords are hashed. JWTs, Google tokens, and identity numbers are not displayed.
- CORS is limited to configured local origins. Safe error details hide internals.

## Academic limitations

Synthetic citizens and rule-derived labels. Near-perfect ML scores mean the tree reproduced documented rules, not real-world government accuracy. There is no Aadhaar verification, OTP, SMS/email delivery, payment, government API, or production monitoring stack.
