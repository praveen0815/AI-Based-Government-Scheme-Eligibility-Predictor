# Explainable eligibility

Phase 35 enhancement of the existing Why this result? view. This is not a second eligibility engine.

## Architecture

Results, scheme cards, and scheme detail continue to render fields that already come from `POST /api/v1/recommend` or `POST /api/v1/wallets/{id}/recommend`:

- `rule_result` / `rule_reasons` / `reason`
- `ml_prediction`
- `agreement`
- `evaluated_schemes[].prediction`

The frontend never computes eligibility. Incomplete evaluation uses `incompleteProfileFields()` / wallet completeness only to label missing stored profile fields.

## User flow

1. Citizen runs the existing hybrid recommendation.
2. Eligible CORE schemes keep the predicted-eligible card and Why this result?
3. Evaluated schemes with `prediction = not_eligible` appear under Not predicted eligible.
4. If the saved profile is missing fields, the page shows Cannot be fully evaluated and: “This information is required to fully evaluate this scheme.”

The UI never says “add this information to become eligible.”

## APIs reused

- `POST /api/v1/recommend`
- `POST /api/v1/wallets/{id}/recommend`
- Wallet completeness

No new APIs.

## Security

Explanations stay on the caller’s session recommendation or owner wallet result. No extra PII is stored.

## Limitations

Citizen profiles have no income or state fields. Rule reasons are the documented engine strings, not invented Age/Income/State checklists.
