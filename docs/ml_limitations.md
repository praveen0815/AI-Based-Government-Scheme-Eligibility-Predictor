# ML limitations

These limits apply to every Phase 4–5 metric and to any later API that serves the saved pipelines.

## 1. Synthetic citizens

`dataset/raw/citizens.csv` was generated with seed `20260814`. The rows are fictional research profiles. They are not a sample of Tamil Nadu residents.

## 2. Rule-derived labels

`eligible` was assigned by `ml/src/eligibility_rules.py` from documented CORE conditions. Labels are not taken from real applications, field officers, or payment records.

## 3. No real application outcomes

No model in this repository has been tested against actual government approvals or rejections. Agreement with the rule engine is not field accuracy.

## 4. Near-perfect tree performance is expected

The Decision Tree sees every factor the labeler used, including `scheme_id`. On held-out synthetic citizens it can reconstruct those AND/OR tests. A score of 1.0 is a consistency check, not proof of real-world skill.

## 5. ML is reproducing structured eligibility logic

The useful scientific statement is: “the tree reproduces the documented CORE rules on unseen synthetic people.” It is not: “the tree learned hidden official policy.”

## 6. Results should not be interpreted as real-world accuracy

Do not quote F1, accuracy, or probability as the chance a real applicant will receive a scheme. Model prediction probability is not government approval.

## 7. Government rules can change

Official pages and Government Orders can be updated. When a CORE rule changes:

1. Update `dataset/raw/schemes.csv` and `eligibility_rules.py`.
2. Relabel `eligibility_dataset.csv` (or regenerate labels only; do not invent new citizens unless the feature set changes).
3. Retrain and re-evaluate.

A stale model must not be treated as the current legal rule.

## Other scope limits

- ADVANCED and HOLD schemes are excluded.
- Unresolved official conflicts (income, education, disability percentage) are not in the labels.
- Random Forest explanations in this phase are global importances, not per-row attributions.
- The project has no FastAPI predictor, no login, and no PostgreSQL-backed decisions yet.
