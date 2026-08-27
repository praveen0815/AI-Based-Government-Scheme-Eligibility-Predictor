# Eligibility Insights

Phase 20 adds a personalized **Eligibility Insights** view for authenticated users. The page explains how the existing hybrid Rule + ML engine evaluated the caller's saved socio-economic wallet against the six CORE schemes.

This is a research prototype. Insights are **not** government approval, official rejection, or a guarantee of eligibility.

## Architecture

```text
React /insights  -->  GET /api/v1/insights
JWT owner only   -->  insights_service
                     |-- require owned wallet
                     |-- recommend_for_citizen (existing hybrid loop + ranking)
                     |-- profile completeness
                     '-- documented-rule reasons for non-recommended schemes
```

The Decision Tree, eligibility rules, hybrid ranking, JWT/Google authentication, wallet schema, history, comparison, PDF, and document-checklist APIs are unchanged.

`GET /api/v1/insights` does **not** write recommendation history. Users who only open Insights do not create a new history row.

Frontend route: `/insights` (protected). Dashboard `/dashboard` shows an Eligibility Insights card and a **View Insights** link.

## Evaluation source

Insights reuse `recommend_for_citizen`:

- All six CORE IDs from `ml_config.CORE_SCHEME_IDS`
- Documented rule is the reference prediction
- Recommended schemes keep the existing ranking: eligible probability descending, then `scheme_id`
- Non-recommended schemes are the evaluated CORE schemes that the rule did not mark eligible

No second model, LLM, or new ranking rule is introduced.

## Response

| Field | Meaning |
| --- | --- |
| `total_schemes_evaluated` | Always 6 when the catalog loads |
| `predicted_eligible_count` | Schemes whose documented rule is eligible |
| `not_recommended_count` | Remaining CORE schemes |
| `recommended_schemes` | Why the prototype predicted eligible |
| `other_schemes` | Why the prototype did not recommend the scheme |
| `completeness` | Existing wallet completeness payload |
| `review_items` | Safe guidance codes only |
| `disclaimer` | Research-prototype notice |

Each scheme includes rule reasons, ML prediction, model eligible probability, and Rule/ML agreement.

Status labels:

- `Predicted eligible`
- `Not recommended by this prototype`

The API never returns "officially rejected" or "government verified".

## Things to Review

Guidance is built only from the saved profile and this evaluation:

| Code | When shown |
| --- | --- |
| `verify_profile` | Always |
| `complete_profile` | When completeness reports missing fields |
| `review_official_source` | Always |
| `review_disagreement` | When any CORE scheme has Rule/ML disagreement |

The service does not tell users to change age, gender, student status, or other personal facts to become eligible.

## Ownership

JWT required. The wallet is loaded for `current_user.id` only. A missing wallet returns HTTP 404, the same as other owned-wallet routes. A caller cannot read another user's insights.

## Document preparation vs insights

| Insights | Document preparation |
| --- | --- |
| Explains hybrid eligibility results | Tracks checklist readiness |
| Uses the current wallet | Uses recommendation history |
| Does not store files or statuses | Stores only checklist status |

## Out of scope

Application Readiness Tracker, new ML models, LLMs, Aadhaar, OTP, government APIs, and file uploads.
