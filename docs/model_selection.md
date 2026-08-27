# Model selection

Phase 5 recommendation for the later prototype. Accuracy was not used as the only criterion.

## Candidates

| Criterion | Logistic Regression | Decision Tree | Random Forest |
| --- | --- | --- | --- |
| F1 (test, with `scheme_id`) | 0.4171 | **1.0000** | 0.9966 |
| Recall | 0.7729 | **1.0000** | 1.0000 |
| Precision | 0.2856 | **1.0000** | 0.9932 |
| PR-AUC | 0.3255 | **1.0000** | 1.0000 |
| Rule-engine agreement | 0.7368 | **1.0000** | 0.9992 |
| Interpretability | Coefficients after encoding | Single tree, readable path | Many trees; harder |
| Local explainability | Coefficient × feature value | Decision path | Global importance only in this project |
| Compute | Light | Lightest | Heavier (largest saved file) |
| Probability quality | Smooth scores; threshold-sensitive | Usually 0 or 1 on this dataset | Close to 0/1 |

## Recommendation

**Use the Decision Tree pipeline** (`ml/models/baseline/decision_tree.joblib`) as the prototype model.

Reasons:

1. It matches the rule-derived labels on held-out citizens (0 disagreements).
2. F1, recall, precision, and PR-AUC are all 1.0 on this synthetic test set.
3. A single tree can emit the decision path used in `ml/src/explanation.py`.
4. It is small and fast enough for a later FastAPI wrapper.
5. Random Forest is almost as accurate but larger, slightly less precise (5 false positives), and only has global importance here.
6. Logistic Regression is more honest as a “soft” probability model, but it disagrees with the documented rules 1,579 times and is a poor eligibility explainer for this project.

## Conditions on this choice

- The tree is **reproducing structured eligibility logic**, not discovering new government rules.
- Near-perfect scores are expected because every labelling factor is in the feature set.
- Default classification threshold stays **0.50**. Threshold sweeps do not change tree metrics on this dataset.
- Human-readable text for users should come from the rule module (`human_readable` in `explanation.py`), not from “the AI thinks…”.
- If official CORE rules change, regenerate labels and retrain. Do not treat the saved tree as a durable legal source.

## Not selected

- **Random Forest:** keep as a backup comparison model. Not the prototype default.
- **Logistic Regression:** keep for threshold and probability demonstrations only.
