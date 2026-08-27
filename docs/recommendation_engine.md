# Recommendation engine

Phase 7. This document describes **personalized eligibility-based scheme recommendation**. It is not behavioral recommendation, not a learned preference model, and not a government priority ranking.

## Flow

```text
Citizen Profile
      ↓
Recommendation API  (POST /api/v1/recommend)
      ↓
CORE Scheme Catalog  (dataset/raw/schemes.csv, ml_scope = CORE)
      ↓
Decision Tree  (ml/models/baseline/decision_tree.joblib, loaded once)
      ↓
Eligibility Prediction  (predict + predict_proba per CORE scheme)
      ↓
Explanation  (ml/src/explanation.py, actual citizen values)
      ↓
Eligible Schemes  (prediction == eligible only)
      ↓
Deterministic Ranking  (probability desc, then scheme_id asc)
      ↓
Personalized Recommendations
```

`POST /api/v1/predict` remains the single-scheme eligibility path. The recommendation endpoint calls that same model and explanation stack six times, once per CORE scheme, without reloading the artifact.

## Eligibility prediction vs recommendation ranking

| Step | What it does | What it does not do |
| --- | --- | --- |
| Eligibility prediction | For one citizen and one CORE `scheme_id`, the saved Decision Tree returns `eligible` / `not_eligible` and class probabilities. | It does not approve an application. It does not score how much a citizen “wants” a scheme. |
| Explanation | Builds a human-readable reason from the supplied citizen values and the documented CORE rules. | It does not call an LLM or invent extra conditions. |
| Recommendation ranking | After prediction, keeps only `eligible` schemes and sorts them with a published, reproducible rule. | It does not represent government priority, real-world personalization, or learned user preferences. |

A scheme is recommended only when the **documented rule engine** says eligible. The Decision Tree is compared independently. `not_eligible` rule results stay in `evaluated_schemes` for research. See `docs/hybrid_rule_ml_design.md`.

## Ranking rule

1. Filter to predicted-eligible schemes.
2. Sort by `eligible_probability` descending.
3. Break ties by `scheme_id` ascending.

The current tree often emits probability `1.0` or `0.0` because it recovered the synthetic rule-derived labels. When several eligible schemes share probability `1.0`, the displayed order is the `scheme_id` tie-break.

Condition-count ranking is not used. An eligible scheme already satisfies every documented CORE condition for that scheme, so a count would only reward schemes that have more checklist items.

## Catalog rules

- Metadata is read from `dataset/raw/schemes.csv`.
- Only `ml_scope = CORE` schemes that the model was trained on are evaluated.
- ADVANCED and HOLD schemes are never recommended.
- `official_source_url` is copied from the catalog. URLs are not guessed.
- `NEEDS VERIFICATION` is returned as that text. Empty cells become `null`.

## Language

The API uses **Predicted eligible** and never states that a citizen is officially eligible. Users must check the official source.

## Out of scope

PostgreSQL, React, authentication, LLMs, chatbots, new models, and deployment belong to later phases.
