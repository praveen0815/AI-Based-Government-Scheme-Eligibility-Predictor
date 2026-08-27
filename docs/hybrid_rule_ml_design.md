# Hybrid Rule + ML eligibility design

This is an academic research prototype. It is not government approval and does not determine real-world eligibility.

## Current architecture (before this phase)

```
Citizen Profile → Decision Tree → Prediction
```

Recommendations were the CORE schemes for which the saved Decision Tree predicted `eligible`.

## New architecture

```
Citizen Profile
 → Official / documented rule engine
 → Rule result
 → Decision Tree
 → ML result
 → Rule / ML comparison
 → Explainable final result
```

The request contract for `/predict` and `/recommend` is unchanged. Existing fields remain. Hybrid fields are added.

## Rule engine role

The rule engine reuses `ml/src/eligibility_rules.py` only. It does not invent conditions.

It is the **authoritative research eligibility reference** because those functions are the documented CORE labeling rules used to create the synthetic dataset.

Returned fields:

- `rule_eligible`
- `rule_reasons`
- `rule_status` from the official catalog
- `verification_notes` when a catalog field is marked `NEEDS VERIFICATION`

## ML role

The saved Decision Tree (`ml/models/baseline/decision_tree.joblib`) remains an independent research predictor.

`eligible_probability` is a **model prediction probability**. It is not government confidence, certainty, or approval.

## Agreement and disagreement

If both agree:

`Rule and ML prediction agree.`

If they differ:

`Rule and ML prediction differ. The documented rule result is shown as the reference result.`

Disagreements are never hidden. `/recommend` includes a scheme when the **documented rule** says eligible, even if the tree disagrees. Ranking is still `eligible_probability` descending, then `scheme_id` ascending.

## Why rules remain the reference

The tree was trained to reproduce rule-derived labels on synthetic citizens. Using the documented rules as the reference keeps the research claim honest: the model is compared with the labeling process, not treated as a government decision.

## Limitations

- Synthetic citizens
- Rule-derived labels
- No real application outcomes
- CORE schemes only
- Model probabilities are not government certainty
- Government rules may change
- The prototype is not an official government system

## Example `/predict` response (shape)

See `docs/api_design.md`. Existing fields `scheme_id`, `prediction`, `eligible_probability`, `not_eligible_probability`, `explanation`, `model_name`, and `disclaimer` are preserved. `prediction` is the documented-rule reference result. `ml_prediction` is the tree output.
