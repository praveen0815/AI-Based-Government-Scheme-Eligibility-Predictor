# Explainable “Why this scheme?”

This phase adds a plain-language explanation of existing hybrid recommendation results. It does not calculate eligibility, retrain the Decision Tree, or change ranking.

> Predictions are not government approval. A documented rule result is the reference when Rule and ML differ.

## Architecture

```text
Results SchemeCard / Scheme detail
  --> existing RecommendResponse fields only
      rule_result, rule_reasons, ml_prediction,
      agreement, eligible_probability, official_source_url
  --> optional incomplete profile fields from the submitted profile
```

The ML model, rule engine, hybrid logic, ranking, authentication, wallet, history, comparison, PDF, documents, readiness, insights, notifications, catalog, datasets, and existing API contracts are unchanged.

## What the panel explains

1. Documented scheme rules checked (`rule_reasons`)
2. Why the rule engine treated the profile as eligible or not (`rule_result.eligible`)
3. What the Decision Tree predicted (`ml_prediction`)
4. Whether Rule and ML agree (`agreement`). On disagreement, the documented rule is the reference
5. What the model probability means (`eligible_probability`)

**Things to review** lists existing incomplete profile fields. Documented `rule_reasons` appear under the rules-checked section. The UI does not tell users to change personal information to become eligible, and it does not say a benefit is guaranteed or government approved.

Result cards keep the explanation in a collapsed **Why this result?** panel. Scheme detail keeps the existing **Why this scheme was recommended** heading visible.
