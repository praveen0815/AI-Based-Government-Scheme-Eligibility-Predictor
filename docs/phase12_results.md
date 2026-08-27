# Phase 12 results

Date: **2026-08-14**.

Application version: **12.0.0** (FastAPI `app.version` and frontend `package.json`). Model artifact versioning is unchanged.

## 1. Phase objective

Polish the existing Phases 1–11 system for college review. No new ML, no dataset changes, no recommendation-logic changes, and no new product features such as Aadhaar, OTP, payment, deployment, or an admin panel.

## 2. Inspection findings

- Navigation already matched the intended public/authenticated set. Home CTAs and titles still used earlier-phase wording.
- The citizen form was a flat list. Labels were questions rather than grouped sections.
- Results used “Your Scheme Recommendations” and the empty state said “No matching schemes were found”.
- Wallet summary was a flat definition list. The Aadhaar disclaimer was incomplete.
- Evaluation numbers were correct but the page needed a stronger synthetic-data banner and the requested system-flow steps.
- Disclaimer text differed slightly across pages.
- Backend contracts, CORS, wallet ownership, and hashed passwords were already in place.

## 3. UI improvements

- Home title, academic banner, four capability cards, primary/secondary CTAs, and optional **Open My Wallet**.
- Grouped citizen form with required markers and field hints. Backend field names unchanged.
- Friendlier range messages: age 0–120; land cannot be negative.
- Wallet grouped cards (Personal, Education, Family & Social, Occupation & Land).
- Results heading **Your Recommended Schemes**, model prediction probability wording, and a CORE-only empty state.
- Schemes page CORE badge, eligibility/documents/application fields, and scope sentence.
- Evaluation banner, F1 interpretation sentence, and the eight-step system flow.
- Standardized disclaimer component.

## 4. Backend improvements

- Application version set to `12.0.0`.
- No endpoint contract changes.
- Existing generic 500/503 handlers remain; they do not return SQL or filesystem paths.

## 5. Security checks

| Check | Result |
| --- | --- |
| Passwords hashed (Argon2 / pwdlib) | Unchanged, still hashed |
| JWT secret from environment | Unchanged |
| Tokens not placed in URLs | Unchanged |
| Login does not distinguish unknown email vs wrong password | Unchanged |
| Wallet routes require JWT and ownership | Unchanged; foreign wallet is 404 |
| Evaluation APIs expose no users/wallets/passwords | Unchanged |
| CORS limited to local Vite origins | Unchanged |
| `.env` gitignored | Unchanged |
| Database not reset | No `DROP` / recreate in this phase |

## 6. Accessibility

Required markers, `aria-invalid` / `aria-required`, semantic headings and fieldsets, visible focus styles, meaningful official-source link text, and keyboard-usable buttons.

## 7. Documentation

- `docs/demo_walkthrough.md`
- `docs/final_system_architecture.md`
- `docs/phase12_results.md`

README files updated only where Phase 12 status and version required it.

## 8. Testing

- Backend: `python -m unittest discover -s tests -v` — **78 passed**
- Frontend: `npm test` — **48 passed**
- Build: `npm run build` — succeeded
- Demo API flow on the documented sample profile: Pudhumai Penn (`TN-SW-001`) when female; Tamil Pudhalvan (`TN-SW-002`) after gender is changed to male. Unauthenticated wallet access returned 401. The created wallet was deleted after the check.

## 9. What was not modified

- `dataset/raw/schemes.csv`
- `dataset/raw/citizens.csv`
- `dataset/processed/eligibility_dataset.csv`
- `ml/models/baseline/decision_tree.joblib`
- eligibility labels, recommendation ranking, wallet schema

## 10. Recommended next step

Stop after Phase 12. Do not add deployment, LLMs, Aadhaar, OTP, payment, government APIs, an admin panel, or new ML algorithms unless a later phase is requested.
