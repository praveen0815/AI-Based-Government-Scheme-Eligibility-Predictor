# Rule engine vs ML comparison

This experiment measures how closely each baseline **reproduces rule-derived labels** on held-out synthetic citizens.
It does **not** show that ML discovered official government rules, and it is not real-world accuracy.

Reference: the deterministic functions in `ml/src/eligibility_rules.py`.
Those functions created `eligible` in `dataset/processed/eligibility_dataset.csv`.

Test set: 1000 citizens, 6000 citizen-scheme rows.
Environment: Python 3.12.10, scikit-learn 1.9.0, pandas 3.0.5, numpy 2.5.2.

## Overall agreement with the rule engine

| Method | Agreement rate | Disagreements | False positives | False negatives |
| --- | ---: | ---: | ---: | ---: |
| Deterministic rule engine | 1.0000 | 0 | 0 | 0 |
| logistic_regression | 0.7368 | 1579 | 1413 | 166 |
| decision_tree | 1.0000 | 0 | 0 | 0 |
| random_forest | 0.9992 | 5 | 5 | 0 |

False positive: model predicts eligible, rule label is not eligible.
False negative: model predicts not eligible, rule label is eligible.

## Per-scheme disagreements

### TN-REV-001

| Model | Agreement | FP | FN |
| --- | ---: | ---: | ---: |
| logistic_regression | 0.5030 | 496 | 1 |
| decision_tree | 1.0000 | 0 | 0 |
| random_forest | 0.9950 | 5 | 0 |

### TN-REV-002

| Model | Agreement | FP | FN |
| --- | ---: | ---: | ---: |
| logistic_regression | 0.7710 | 193 | 36 |
| decision_tree | 1.0000 | 0 | 0 |
| random_forest | 1.0000 | 0 | 0 |

### TN-SW-001

| Model | Agreement | FP | FN |
| --- | ---: | ---: | ---: |
| logistic_regression | 0.8560 | 134 | 10 |
| decision_tree | 1.0000 | 0 | 0 |
| random_forest | 1.0000 | 0 | 0 |

### TN-SW-002

| Model | Agreement | FP | FN |
| --- | ---: | ---: | ---: |
| logistic_regression | 0.6800 | 262 | 58 |
| decision_tree | 1.0000 | 0 | 0 |
| random_forest | 1.0000 | 0 | 0 |

### TN-SW-004

| Model | Agreement | FP | FN |
| --- | ---: | ---: | ---: |
| logistic_regression | 0.8330 | 145 | 22 |
| decision_tree | 1.0000 | 0 | 0 |
| random_forest | 1.0000 | 0 | 0 |

### TN-SW-006

| Model | Agreement | FP | FN |
| --- | ---: | ---: | ---: |
| logistic_regression | 0.7780 | 183 | 39 |
| decision_tree | 1.0000 | 0 | 0 |
| random_forest | 1.0000 | 0 | 0 |

## How to read these numbers

The rule engine is the label generator. Perfect tree agreement means the tree recovered those
same AND/OR tests on unseen synthetic citizens. It does not mean the tree independently
learned unpublished government policy.
