# Phase 43 results

Final integration, QA, and demo-readiness pass. Authentication implementation, backend Hybrid Rule + ML eligibility logic, and database schemas were not changed. No APIs were added or duplicated.

## QA plan

| Area | Check | Result |
| --- | --- | --- |
| Authentication and routing | Google Sign-in and password login open Dashboard | Pass — existing `auth.test.tsx` plus Phase 43 JWT non-exposure |
| Authentication and routing | Unauthenticated access to protected routes goes to Login | Pass — 15-route redirect matrix |
| JWT | Token stored in `sessionStorage` (`prototypeAuthToken`); Google ID token is not persisted | Pass |
| JWT expiry | HTTP 401 clears the session and returns to Login | Pass — wallet and applications coverage |
| Token refresh | Refresh-token flow | Not applicable — academic session JWT; expired tokens are cleared, not refreshed |
| Feature integration | Dashboard, Eligibility, Schemes, Details, Compare, History, Documents, Readiness, Insights, Notifications, Voice, Simulator, Applications, Research Dashboard | Pass — existing module tests plus sidebar/nav regression |
| Voice income | Income / what-if questions explain first and show **Open Eligibility Simulator**; no auto-navigation; no wallet write | Pass |
| Simulator | Never `PUT`s the wallet; uses public `POST /api/v1/recommend`; values labeled temporary | Pass |
| Eligibility source | Frontend displays backend recommendation statuses only | Pass — no second eligibility engine |
| Eligibility copy | No “add this information to become eligible” | Pass |
| Security | Protected routes, owner-scoped wallet/applications, tokens not rendered | Pass — no auth or ownership code changes |
| API contracts | Existing endpoints only | Pass |
| i18n | English and Tamil dictionaries include Phase 43 copy | Pass |
| Suites | Frontend tests, `tsc`, production build, backend unittest | See Testing below |

## Demo path

```text
Login or Google Sign-In
  → Dashboard
  → Wallet / Check Eligibility
  → Hybrid results (Eligible / Not Eligible / Cannot Be Fully Evaluated)
  → Compare (empty state if no 2–3 schemes selected)
  → History, Documents, Readiness, Insights, Notifications
  → Voice Assistant (income questions → explanation + simulator CTA)
  → Eligibility Simulator (temporary copy; wallet unchanged)
  → Applications (personal tracking only)
  → Schemes / Scheme details
  → Research Dashboard / System Evaluation
```

## Findings

1. **No refresh token.** `expires_in` is returned by login/Google, but the portal does not refresh JWTs. A 401 from any protected API clears `prototypeAuthToken` and redirects to Login. This is intentional for the academic prototype. Do not add a refresh endpoint without a new auth design.
2. **Income is not a wallet field.** Voice income questions must not invent or store income. They explain this and offer the simulator CTA. Explicit “open the eligibility simulator” remains a separate navigation intent.
3. **Compare without a selection.** Opening `/compare` from the sidebar previously redirected to `/results`. That looked like a broken navigation path during demos. Phase 43 shows an empty state with links to Results and Schemes instead.
4. **Simulator labels.** Simulated form values were already independent of `PUT /wallets`, but the temporary-copy notice was easy to miss. The form now shows **Current saved profile**, a **Simulation** badge, and an explicit temporary-copy sentence.
5. **Status wording.** Catalog and simulator use Eligible / Not Eligible / Cannot Be Fully Evaluated. Results keep “Predicted eligible” / “Not predicted eligible” so the UI does not sound like official government approval. Incomplete evaluation uses “This information is required to fully evaluate this scheme.”
6. **PostgreSQL ownership tests** skip unless `TEST_DATABASE_URL` points at a running test database. System Python 3.13 is not the project interpreter; use `backend\.venv`.

## Fixes in this phase

Frontend only:

- Compare empty state when fewer than two or more than three scheme IDs are present.
- Simulator temporary-copy heading, badge, and English/Tamil copy.
- Phase 43 regression suite for redirects, JWT non-exposure, eligibility copy, nav coverage, 401 session clear, and income CTA.
- Stronger simulator and compare tests.

Not changed: `AuthContext` login/logout, JWT issuance, Google sign-in, recommend/hybrid scoring, ranking, wallet schema, `application_tracking`, or any API contract.

## Module checklist

| Module | Route | Auth | Notes |
| --- | --- | --- | --- |
| Login / Register / Google | `/login`, `/register` | Public; signed-in users go to Dashboard | JWT in sessionStorage only |
| Dashboard | `/dashboard` | Protected | Post-login entry; snapshot + quick actions |
| Eligibility check | `/check` | Public form; wallet compare/PDF need sign-in | Scores via `POST /api/v1/recommend` |
| Results | `/results` | Public session result | Backend statuses only |
| Scheme discovery | `/schemes` | Public | Catalog + optional recommendation overlay |
| Scheme details | `/schemes/:schemeId` | Public | Official source links |
| Compare | `/compare` | Protected | Empty state without 2–3 IDs; API `/api/v1/compare` |
| History | `/history` | Protected | Owner rows only |
| Documents | `/documents` | Protected | Checklist, not government submit |
| Readiness | `/readiness` | Protected | Manual preparation stages |
| Insights | `/insights` | Protected | Backend insights payload |
| Notifications | `/notifications` | Protected | Owner-only in-app list |
| Voice Assistant | `/voice-assistant` | Protected | Income CTA; no stored-income write |
| Eligibility Simulator | `/eligibility-simulator` | Protected | Public `/recommend`; no wallet PUT |
| Applications | `/applications` | Protected | Owner tracking table |
| Research Dashboard | `/research-dashboard` | Protected | Phase 29 metrics; not an admin console |

## Security notes

- `ProtectedRoute` redirects unauthenticated visitors to `/login`.
- Bearer JWT is attached by `api.ts`. Tokens and Google credentials are not rendered in the UI.
- 401 on a protected call clears the session. There is no silent refresh.
- Wallet, history, documents, readiness, uploads, notifications, and applications remain owner-scoped on the backend (404 for another user's id). This pass did not alter those checks.
- Simulation and public `/recommend` do not write history or the wallet.

## Testing

Commands:

```powershell
cd frontend
npm test
npx tsc -b
npm run build

cd ..\backend
.\.venv\Scripts\python.exe -m unittest discover -s tests -q
```

Recorded in this pass:

- Frontend: see the command output in the Phase 43 run (includes `phase43-readiness.test.tsx`).
- `npx tsc -b` and `npm run build` must be clean.
- Backend unittest via `.venv`; ownership tests skip without PostgreSQL.

## Limitations

Academic prototype. Synthetic citizens and rule-derived labels. Predictions are not government approval. No Aadhaar, OTP, SMS/email, payment, government application API, production monitoring, or JWT refresh.
