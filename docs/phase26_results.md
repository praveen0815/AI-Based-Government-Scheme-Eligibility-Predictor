# Phase 26 results — Explainable “Why this scheme?”

Date: **2026-09-04**.

This phase adds an explainable view of existing hybrid recommendations on top of Phases 1–25. The Decision Tree was not retrained. Datasets and `decision_tree.joblib` were not modified. Eligibility rules, hybrid ranking, authentication, wallet, history, comparison, PDF, documents, readiness, insights, notifications, catalog, and existing API contracts were not changed.

## What changed

- Result `SchemeCard` now has a collapsed **Why this result?** panel.
- The panel restates documented rules checked, the rule-engine result, the Decision Tree prediction, Rule/ML agreement, and what the model probability means.
- If Rule and ML disagree, the documented rule is shown as the reference.
- **Things to review** uses existing incomplete profile fields and `rule_reasons` only.
- Scheme detail keeps **Why this scheme was recommended** visible and uses the same explanation structure.
- English/Tamil copy uses the existing `useI18n()` dictionaries.

## Testing

Frontend `npm test`: **125 passed**, including the collapsed Why this result? panel, disagreement reference wording, incomplete-field review items, and existing results/detail locked strings.

## Limitations

This is research-prototype explainability only. It does not approve applications, guarantee benefits, or advise users to change personal information.
