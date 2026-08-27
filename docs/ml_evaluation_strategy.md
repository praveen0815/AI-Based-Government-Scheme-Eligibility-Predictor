# ML evaluation strategy

Phase 4 primary evaluation keeps each synthetic citizen entirely in train or entirely in test.

## Why a row-wise split is unsafe here

`eligibility_dataset.csv` has six rows per `citizen_id` (one per CORE scheme). A random 80/20 split of rows would put some of a citizen’s scheme-rows in training and others in testing.

That is citizen-level leakage: the model can see the same age, gender, land, and school background in training and then be tested on another scheme for that same person. Metrics would overstate generalisation to new citizens.

## Primary split

| Item | Choice |
| --- | --- |
| Unit | `citizen_id` |
| Ratio | 80% train / 20% test |
| Seed | `20260814` |
| Stratification | Per-citizen count of `eligible=1` rows (rare counts merged if a stratum has fewer than 5 citizens) |

Because every citizen already has all six schemes, both splits automatically contain every CORE `scheme_id`. Stratifying on how many schemes a citizen matches keeps the overall positive rate similar in train and test.

After the split:

- Train rows = train citizens × 6
- Test rows = test citizens × 6
- Intersection of train and test `citizen_id` sets must be empty

Citizen ID lists are written to `ml/models/baseline/train_citizen_ids.csv` and `test_citizen_ids.csv`.

## Metrics

Accuracy is reported but is not enough. The labelled set is negative-heavy (about 12% eligible). Phase 4 also reports precision, recall, F1, balanced accuracy, ROC-AUC, and PR-AUC / average precision, overall and per scheme, on the **test citizens only**.

`class_weight="balanced"` is used on all three baselines because of that imbalance.

## Preprocessing and fitting order

1. Split citizens.
2. Fit `ColumnTransformer` on **training rows only**.
3. Transform test rows with the fitted encoder/scaler.
4. Train the classifier on the transformed training rows.

Logistic Regression scales numeric columns (age and land). Decision Tree and Random Forest leave numeric columns unscaled. Categorical columns are one-hot encoded in all models. `handle_unknown="ignore"` is set so an unseen category at test time does not crash inference.

## Alternative experiment

The same citizen split is reused without `scheme_id`. That run is a comparison, not the primary reported system.

## What this evaluation does not claim

Test performance is agreement with the documented rule engine on held-out **synthetic** citizens. It is not accuracy on real Tamil Nadu applications.
