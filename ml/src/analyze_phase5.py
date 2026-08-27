"""Phase 5 analysis: rule-vs-ML comparison, thresholds, and example explanations."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

import sklearn

from eligibility_rules import evaluate_scheme
from explanation import explain_prediction
from ml_config import FEATURE_COLUMNS, ID_COLUMN, SEED, TARGET_COLUMN, dataset_path, repo_root
from train_baseline_models import file_sha256, split_by_citizen

MODEL_FILES = {
    "logistic_regression": "logistic_regression.joblib",
    "decision_tree": "decision_tree.joblib",
    "random_forest": "random_forest.joblib",
}
THRESHOLDS = (0.30, 0.40, 0.50, 0.60, 0.70)
STRONG_MODEL = "decision_tree"


def fmt(value: float) -> str:
    if value != value:
        return "NA"
    return f"{value:.4f}"


def citizen_dict(row: pd.Series) -> dict:
    return {column: row[column] for column in FEATURE_COLUMNS if column != "scheme_id"} | {
        "age": row["age"],
        "wet_land_acres": row["wet_land_acres"],
        "dry_land_acres": row["dry_land_acres"],
        "gender": row["gender"],
        "is_student": row["is_student"],
        "first_higher_education_course": row["first_higher_education_course"],
        "school_background": row["school_background"],
        "marital_status": row["marital_status"],
        "is_orphan": row["is_orphan"],
        "is_destitute": row["is_destitute"],
        "occupation_category": row["occupation_category"],
    }


def compare_to_rules(y_rule: np.ndarray, y_pred: np.ndarray) -> dict[str, float]:
    matrix = confusion_matrix(y_rule, y_pred, labels=[0, 1])
    tn, fp, fn, tp = (int(matrix[0, 0]), int(matrix[0, 1]), int(matrix[1, 0]), int(matrix[1, 1]))
    total = tn + fp + fn + tp
    return {
        "agreement_rate": (tn + tp) / total,
        "disagreements": fp + fn,
        "false_positives": fp,
        "false_negatives": fn,
        "true_positives": tp,
        "true_negatives": tn,
    }


def threshold_metrics(y_true: np.ndarray, y_score: np.ndarray, threshold: float) -> dict[str, float]:
    y_pred = (y_score >= threshold).astype(int)
    return {
        "threshold": threshold,
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
        "pr_auc": float(average_precision_score(y_true, y_score)),
    }


def main() -> int:
    root = repo_root()
    df = pd.read_csv(dataset_path())
    df[TARGET_COLUMN] = df[TARGET_COLUMN].astype(int)
    _, test_df, _, _ = split_by_citizen(df)
    y_rule = test_df[TARGET_COLUMN].to_numpy()
    x_test = test_df[FEATURE_COLUMNS]

    models_dir = root / "ml" / "models" / "baseline"
    pipelines = {name: joblib.load(models_dir / filename) for name, filename in MODEL_FILES.items()}

    comparisons = {
        "rule_engine": {
            "agreement_rate": 1.0,
            "disagreements": 0,
            "false_positives": 0,
            "false_negatives": 0,
            "true_positives": int((y_rule == 1).sum()),
            "true_negatives": int((y_rule == 0).sum()),
        }
    }
    scores: dict[str, np.ndarray] = {}
    preds: dict[str, np.ndarray] = {}
    for name, pipeline in pipelines.items():
        y_pred = pipeline.predict(x_test)
        y_score = pipeline.predict_proba(x_test)[:, 1]
        preds[name] = y_pred
        scores[name] = y_score
        comparisons[name] = compare_to_rules(y_rule, y_pred)

    by_scheme: dict[str, dict[str, dict[str, float]]] = {}
    for scheme_id, group in test_df.groupby("scheme_id"):
        scheme_truth = group[TARGET_COLUMN].to_numpy()
        scheme_x = group[FEATURE_COLUMNS]
        by_scheme[str(scheme_id)] = {}
        for name, pipeline in pipelines.items():
            by_scheme[str(scheme_id)][name] = compare_to_rules(
                scheme_truth, pipeline.predict(scheme_x)
            )

    dt_thresholds = [threshold_metrics(y_rule, scores[STRONG_MODEL], value) for value in THRESHOLDS]
    lr_thresholds = [threshold_metrics(y_rule, scores["logistic_regression"], value) for value in THRESHOLDS]

    examples = []
    sample_rows = test_df.sample(n=4, random_state=SEED)
    for _, row in sample_rows.iterrows():
        citizen = citizen_dict(row)
        examples.append(
            explain_prediction(
                citizen,
                str(row["scheme_id"]),
                pipelines[STRONG_MODEL],
                STRONG_MODEL,
            )
        )

    versions = {
        "python": sys.version.split()[0],
        "scikit_learn": sklearn.__version__,
        "pandas": pd.__version__,
        "numpy": np.__version__,
        "random_seed": SEED,
        "dataset_sha256": file_sha256(dataset_path()),
        "test_rows": int(len(test_df)),
        "test_citizens": int(test_df[ID_COLUMN].nunique()),
    }
    (models_dir / "phase5_metadata.json").write_text(json.dumps(versions, indent=2), encoding="utf-8")

    comparison_lines = [
        "# Rule engine vs ML comparison",
        "",
        "This experiment measures how closely each baseline **reproduces rule-derived labels** on held-out synthetic citizens.",
        "It does **not** show that ML discovered official government rules, and it is not real-world accuracy.",
        "",
        "Reference: the deterministic functions in `ml/src/eligibility_rules.py`.",
        "Those functions created `eligible` in `dataset/processed/eligibility_dataset.csv`.",
        "",
        f"Test set: {versions['test_citizens']} citizens, {versions['test_rows']} citizen-scheme rows.",
        f"Environment: Python {versions['python']}, scikit-learn {versions['scikit_learn']}, "
        f"pandas {versions['pandas']}, numpy {versions['numpy']}.",
        "",
        "## Overall agreement with the rule engine",
        "",
        "| Method | Agreement rate | Disagreements | False positives | False negatives |",
        "| --- | ---: | ---: | ---: | ---: |",
        f"| Deterministic rule engine | 1.0000 | 0 | 0 | 0 |",
    ]
    for name in ("logistic_regression", "decision_tree", "random_forest"):
        item = comparisons[name]
        comparison_lines.append(
            f"| {name} | {item['agreement_rate']:.4f} | {item['disagreements']} | "
            f"{item['false_positives']} | {item['false_negatives']} |"
        )
    comparison_lines.extend(
        [
            "",
            "False positive: model predicts eligible, rule label is not eligible.",
            "False negative: model predicts not eligible, rule label is eligible.",
            "",
            "## Per-scheme disagreements",
            "",
        ]
    )
    for scheme_id in sorted(by_scheme):
        comparison_lines.append(f"### {scheme_id}")
        comparison_lines.append("")
        comparison_lines.append("| Model | Agreement | FP | FN |")
        comparison_lines.append("| --- | ---: | ---: | ---: |")
        for name in ("logistic_regression", "decision_tree", "random_forest"):
            item = by_scheme[scheme_id][name]
            comparison_lines.append(
                f"| {name} | {item['agreement_rate']:.4f} | {item['false_positives']} | {item['false_negatives']} |"
            )
        comparison_lines.append("")
    comparison_lines.extend(
        [
            "## How to read these numbers",
            "",
            "The rule engine is the label generator. Perfect tree agreement means the tree recovered those",
            "same AND/OR tests on unseen synthetic citizens. It does not mean the tree independently",
            "learned unpublished government policy.",
            "",
        ]
    )
    (root / "docs" / "rule_vs_ml_comparison.md").write_text("\n".join(comparison_lines), encoding="utf-8")

    threshold_md = [
        "# Threshold analysis",
        "",
        f"Predicted class = 1 when P(eligible) >= threshold. The default Phase 4 threshold remains **0.50**.",
        "No production threshold was changed.",
        "",
        f"## {STRONG_MODEL} (strongest F1 candidate)",
        "",
        "| Threshold | Precision | Recall | F1 | Balanced Accuracy | PR-AUC |",
        "| ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for item in dt_thresholds:
        threshold_md.append(
            f"| {item['threshold']:.2f} | {fmt(item['precision'])} | {fmt(item['recall'])} | "
            f"{fmt(item['f1'])} | {fmt(item['balanced_accuracy'])} | {fmt(item['pr_auc'])} |"
        )
    threshold_md.extend(
        [
            "",
            "Decision-tree leaf probabilities are usually 0 or 1 on this rule-derived set, so thresholds",
            "other than 0.50 change little. That is expected, not a reason to treat the tree as a",
            "calibrated probability model.",
            "",
            "## logistic_regression (for contrast)",
            "",
            "| Threshold | Precision | Recall | F1 | Balanced Accuracy | PR-AUC |",
            "| ---: | ---: | ---: | ---: | ---: | ---: |",
        ]
    )
    for item in lr_thresholds:
        threshold_md.append(
            f"| {item['threshold']:.2f} | {fmt(item['precision'])} | {fmt(item['recall'])} | "
            f"{fmt(item['f1'])} | {fmt(item['balanced_accuracy'])} | {fmt(item['pr_auc'])} |"
        )
    threshold_md.extend(
        [
            "",
            "Logistic Regression probabilities move with the threshold: lower thresholds raise recall and",
            "lower precision. PR-AUC is threshold-independent and is the same in every row.",
            "",
        ]
    )
    (root / "docs" / "threshold_analysis.md").write_text("\n".join(threshold_md), encoding="utf-8")

    example_blocks = []
    for item in examples:
        example_blocks.append(
            "```json\n" + json.dumps(item, indent=2) + "\n```"
        )

    print(json.dumps({"versions": versions, "comparisons": comparisons, "examples": examples}, indent=2))
    (models_dir / "phase5_examples.json").write_text(json.dumps(examples, indent=2), encoding="utf-8")
    (models_dir / "phase5_comparisons.json").write_text(json.dumps(comparisons, indent=2), encoding="utf-8")
    (models_dir / "phase5_thresholds.json").write_text(
        json.dumps({"decision_tree": dt_thresholds, "logistic_regression": lr_thresholds}, indent=2),
        encoding="utf-8",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
