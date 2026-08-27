# Baseline model results

Phase 4 baseline classifiers on the synthetic CORE eligibility dataset.
Labels were not modified. These scores measure agreement with the rule engine, not real application outcomes.

## Setup

- Dataset: `dataset/processed/eligibility_dataset.csv` (SHA-256 `ba91158194b4060be01894306d72ae25b96e4abeebbdf4ff61e93ffd059d30d0`)
- Rows: 30000; citizens: 5000
- Train citizens / rows: 4000 / 24000
- Test citizens / rows: 1000 / 6000
- Split: citizen-grouped, 80/20, seed `20260814`, stratified by per-citizen eligible-scheme count
- Python: 3.12.10 (project standard; `ml/.venv`)
- scikit-learn: 1.9.0
- pandas: 3.0.5
- numpy: 2.5.2

## Overall test metrics (primary: with `scheme_id`)

| Model | Accuracy | Precision | Recall | F1 | Balanced Accuracy | ROC-AUC | PR-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| logistic_regression | 0.7368 | 0.2856 | 0.7729 | 0.4171 | 0.7524 | 0.8338 | 0.3255 |
| decision_tree | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| random_forest | 0.9992 | 0.9932 | 1.0000 | 0.9966 | 0.9995 | 1.0000 | 1.0000 |

Best baseline by F1: **decision_tree**.

## Overall test metrics (alternative: without `scheme_id`)

| Model | Accuracy | Precision | Recall | F1 | Balanced Accuracy | ROC-AUC | PR-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| logistic_regression (no scheme_id) | 0.5718 | 0.1848 | 0.7373 | 0.2956 | 0.6431 | 0.7101 | 0.2293 |
| decision_tree (no scheme_id) | 0.4602 | 0.1833 | 0.9932 | 0.3095 | 0.6897 | 0.7250 | 0.2305 |
| random_forest (no scheme_id) | 0.4725 | 0.1855 | 0.9822 | 0.3121 | 0.6920 | 0.7282 | 0.2408 |

`scheme_id` is used in the primary experiment because each row is a citizen–scheme pair and the six CORE rules are different. Without it, the model must infer scheme identity only from how features interact, which is a harder and less appropriate setup for this dataset.

## Per-scheme test metrics (primary models)

### logistic_regression

| scheme_id | Accuracy | Precision | Recall | F1 | Balanced Accuracy | ROC-AUC | PR-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| TN-SW-001 | 0.8560 | 0.3825 | 0.8925 | 0.5355 | 0.8724 | 0.9198 | 0.4414 |
| TN-SW-002 | 0.6800 | 0.1382 | 0.4200 | 0.2079 | 0.5644 | 0.7168 | 0.1599 |
| TN-SW-004 | 0.8330 | 0.2246 | 0.6562 | 0.3347 | 0.7507 | 0.8734 | 0.3392 |
| TN-SW-006 | 0.7780 | 0.1757 | 0.5000 | 0.2600 | 0.6508 | 0.8329 | 0.3569 |
| TN-REV-001 | 0.5030 | 0.4053 | 0.9971 | 0.5763 | 0.6233 | 0.5761 | 0.3729 |
| TN-REV-002 | 0.7710 | 0.0981 | 0.3684 | 0.1550 | 0.5819 | 0.6739 | 0.0824 |

### decision_tree

| scheme_id | Accuracy | Precision | Recall | F1 | Balanced Accuracy | ROC-AUC | PR-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| TN-SW-001 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| TN-SW-002 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| TN-SW-004 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| TN-SW-006 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| TN-REV-001 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| TN-REV-002 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |

### random_forest

| scheme_id | Accuracy | Precision | Recall | F1 | Balanced Accuracy | ROC-AUC | PR-AUC |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| TN-SW-001 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| TN-SW-002 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| TN-SW-004 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| TN-SW-006 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |
| TN-REV-001 | 0.9950 | 0.9855 | 1.0000 | 0.9927 | 0.9962 | 1.0000 | 1.0000 |
| TN-REV-002 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 | 1.0000 |

## Confusion matrices

Saved under `ml/models/evaluation/` as `.png`, `.csv`, and `.txt` for each primary model.

## Limitations

1. Labels are derived from official CORE rules, not from real applications.
2. Citizen profiles are synthetic.
3. The models are not validated against real government outcomes.
4. High test scores mean the model recovered the rule engine on held-out synthetic citizens.
5. Phase 4 is methodological evaluation and a prototype predictor, not a production eligibility decision system.
