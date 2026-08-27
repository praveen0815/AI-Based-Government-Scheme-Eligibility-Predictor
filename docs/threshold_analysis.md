# Threshold analysis

Predicted class = 1 when P(eligible) >= threshold. The default Phase 4 threshold remains **0.50**.
No production threshold was changed.

## decision_tree (strongest F1 candidate)

| Threshold | Precision | Recall | F1 | Balanced Accuracy | PR-AUC |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0.30 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| 0.40 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| 0.50 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| 0.60 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| 0.70 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |

Decision-tree leaf probabilities are usually 0 or 1 on this rule-derived set, so thresholds
other than 0.50 change little. That is expected, not a reason to treat the tree as a
calibrated probability model.

## logistic_regression (for contrast)

| Threshold | Precision | Recall | F1 | Balanced Accuracy | PR-AUC |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 0.30 | 0.2149 | 0.9672 | 0.3517 | 0.7385 | 0.3255 |
| 0.40 | 0.2478 | 0.9001 | 0.3887 | 0.7606 | 0.3255 |
| 0.50 | 0.2856 | 0.7729 | 0.4171 | 0.7524 | 0.3255 |
| 0.60 | 0.3336 | 0.6088 | 0.4310 | 0.7200 | 0.3255 |
| 0.70 | 0.3627 | 0.4446 | 0.3995 | 0.6681 | 0.3255 |

Logistic Regression probabilities move with the threshold: lower thresholds raise recall and
lower precision. PR-AUC is threshold-independent and is the same in every row.
