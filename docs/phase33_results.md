# Phase 33 results — Personalized scheme discovery and smart filtering

Date: **2026-09-08**.

Phase 33 is a scheme discovery and filtering layer on the existing `/schemes` catalog page. It does not replace or modify the existing eligibility engine.

The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, authentication, wallet ownership, history, comparison APIs, PDF, documents, readiness, insights, notifications, voice assistant, system evaluation, and existing API contracts were not changed.

## What changed

- `/schemes` search now matches scheme name, ID, description, notes, benefit text, category, and department.
- Category and department filters use values that already exist in the catalog response. No backend categories were invented.
- An eligibility filter reads the existing recommendation response only: Eligible, Not Eligible, or Cannot Be Fully Evaluated.
- Sorting supports Relevance, Scheme Name A–Z / Z–A, and Eligible First using that same recommendation status.
- The result count updates with search and filters, including “Showing 3 eligible schemes” and “No schemes found”.
- **Clear Filters** appears only when filters are active and restores the default catalog list plus URL.
- Scheme cards show name, short description, category, department, eligibility status when available, View Details, Compare, Check Eligibility, and Official Source.
- Compare checkboxes reuse `navigate("/compare", { state: { schemeIds } })` with the existing 2–3 scheme limit.
- **Recommended for You** lists eligible and incomplete schemes from the existing `POST /api/v1/wallets/{id}/recommend` result. It does not claim government approval.
- Active filters can be shared as `/schemes?category=...&eligibility=eligible`.

## APIs reused

| API | Role |
| --- | --- |
| `GET /api/v1/catalog` | Scheme catalog for search and filters |
| `GET /api/v1/wallets/me` | Load the saved wallet once when no recommendation is in session |
| `POST /api/v1/wallets/{id}/recommend` | Existing hybrid eligibility overlay |
| `GET /api/v1/wallets/me/completeness` | Missing-field language for “cannot be fully evaluated” |
| `POST /api/v1/compare` | Existing comparison page |

No new backend routes were added.

## Security

Public visitors still browse the catalog. Wallet and recommend calls remain JWT owner-only. Tokens, passwords, Google credentials, and identity numbers are not shown. Unauthenticated compare still asks the user to sign in.

## Accessibility

Filter controls have labels. Search is a labeled field. Result count is announced with `aria-live`. Eligibility uses text labels, not color alone. Compare checkboxes include the scheme name.

## Testing

Frontend `npm test`: **171 passed**. `npx tsc -b` and `npm run build` passed. Backend `python -m unittest discover -s tests -q`: **167 ran, 37 skipped**.

Frontend tests cover catalog rendering, keyword and ID search, category, department, eligibility, combined filters, result count, Clear Filters, sorting, empty / loading / error states, URL state, compare selection, Recommended for You, accessibility labels, Tamil copy, and existing scheme-detail behavior.

## Known limitations

Without a recommendation result, eligibility status is hidden and eligibility filters do not invent matches. CORE evaluation does not cover ADVANCED / HOLD rows, so those appear as cannot be fully evaluated. Filter state lives in the URL; recommendation data stays in session. This remains an academic research prototype.
