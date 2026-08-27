"""Train Phase 4 baseline classifiers with a citizen-grouped split.

Does not change source labels and does not expose a prediction API.
"""

from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.tree import DecisionTreeClassifier

SRC_DIR = Path(__file__).resolve().parent
if str(SRC_DIR) not in sys.path:
    sys.path.insert(0, str(SRC_DIR))

from ml_config import (
    CATEGORICAL_FEATURES,
    CATEGORICAL_FEATURES_NO_SCHEME,
    FEATURE_COLUMNS,
    FEATURE_COLUMNS_NO_SCHEME,
    ID_COLUMN,
    LEAKAGE_COLUMNS,
    NUMERIC_FEATURES,
    SEED,
    TARGET_COLUMN,
    TEST_SIZE,
    dataset_path,
    repo_root,
)

CORE_SCHEMES = (
    "TN-SW-001",
    "TN-SW-002",
    "TN-SW-004",
    "TN-SW-006",
    "TN-REV-001",
    "TN-REV-002",
)


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            digest.update(chunk)
    return digest.hexdigest()


def assert_no_leakage_columns(feature_columns: list[str]) -> None:
    leaked = set(feature_columns) & set(LEAKAGE_COLUMNS)
    if leaked:
        raise ValueError(f"Leakage columns selected as features: {sorted(leaked)}")


def citizen_strata(df: pd.DataFrame) -> pd.Series:
    eligible_count = df.groupby(ID_COLUMN)[TARGET_COLUMN].sum().astype(int)
    counts = eligible_count.value_counts()
    rare = set(counts[counts < 5].index)
    return eligible_count.map(lambda value: 99 if value in rare else value)


def split_by_citizen(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame, list[str], list[str]]:
    citizens = df[ID_COLUMN].drop_duplicates()
    strata = citizen_strata(df).loc[citizens]
    train_ids, test_ids = train_test_split(
        citizens.to_numpy(),
        test_size=TEST_SIZE,
        random_state=SEED,
        stratify=strata.to_numpy(),
    )
    train_ids = [str(value) for value in train_ids]
    test_ids = [str(value) for value in test_ids]
    overlap = set(train_ids) & set(test_ids)
    if overlap:
        raise ValueError(f"Citizen leakage in split: {len(overlap)} shared IDs")
    train_df = df[df[ID_COLUMN].isin(train_ids)].copy()
    test_df = df[df[ID_COLUMN].isin(test_ids)].copy()
    return train_df, test_df, train_ids, test_ids


def make_preprocessor(categorical_features: list[str], scale_numeric: bool) -> ColumnTransformer:
    numeric_step = StandardScaler() if scale_numeric else "passthrough"
    return ColumnTransformer(
        transformers=[
            ("num", numeric_step, NUMERIC_FEATURES),
            (
                "cat",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                categorical_features,
            ),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )


def make_models() -> dict[str, object]:
    return {
        "logistic_regression": LogisticRegression(
            class_weight="balanced",
            max_iter=2000,
            random_state=SEED,
        ),
        "decision_tree": DecisionTreeClassifier(
            class_weight="balanced",
            random_state=SEED,
        ),
        "random_forest": RandomForestClassifier(
            n_estimators=100,
            class_weight="balanced",
            random_state=SEED,
            n_jobs=-1,
        ),
    }


def metrics_dict(y_true: np.ndarray, y_pred: np.ndarray, y_score: np.ndarray) -> dict[str, float]:
    result = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "precision": float(precision_score(y_true, y_pred, zero_division=0)),
        "recall": float(recall_score(y_true, y_pred, zero_division=0)),
        "f1": float(f1_score(y_true, y_pred, zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y_true, y_pred)),
    }
    if len(np.unique(y_true)) > 1:
        result["roc_auc"] = float(roc_auc_score(y_true, y_score))
        result["pr_auc"] = float(average_precision_score(y_true, y_score))
    else:
        result["roc_auc"] = float("nan")
        result["pr_auc"] = float("nan")
    return result


def per_scheme_metrics(
    test_df: pd.DataFrame,
    y_true: np.ndarray,
    y_pred: np.ndarray,
    y_score: np.ndarray,
) -> dict[str, dict[str, float]]:
    output: dict[str, dict[str, float]] = {}
    schemes = test_df["scheme_id"].to_numpy()
    for scheme_id in CORE_SCHEMES:
        mask = schemes == scheme_id
        output[scheme_id] = metrics_dict(y_true[mask], y_pred[mask], y_score[mask])
        output[scheme_id]["support"] = float(mask.sum())
        output[scheme_id]["positives"] = float(y_true[mask].sum())
    return output


def save_confusion_matrix(y_true: np.ndarray, y_pred: np.ndarray, stem: Path) -> None:
    matrix = confusion_matrix(y_true, y_pred, labels=[0, 1])
    pd.DataFrame(matrix, index=["true_0", "true_1"], columns=["pred_0", "pred_1"]).to_csv(
        stem.with_suffix(".csv")
    )
    stem.with_suffix(".txt").write_text(
        f"tn={matrix[0, 0]} fp={matrix[0, 1]} fn={matrix[1, 0]} tp={matrix[1, 1]}\n",
        encoding="utf-8",
    )
    fig, axis = plt.subplots(figsize=(4.5, 4.0))
    image = axis.imshow(matrix, cmap="Blues")
    axis.set_xticks([0, 1], labels=["Predicted 0", "Predicted 1"])
    axis.set_yticks([0, 1], labels=["Actual 0", "Actual 1"])
    axis.set_title(stem.name.replace("_", " "))
    for row in range(2):
        for col in range(2):
            axis.text(col, row, str(matrix[row, col]), ha="center", va="center", color="black")
    fig.colorbar(image, ax=axis, fraction=0.046)
    fig.tight_layout()
    fig.savefig(stem.with_suffix(".png"), dpi=140)
    plt.close(fig)


def encoded_feature_names(pipeline: Pipeline, categorical_features: list[str]) -> np.ndarray:
    preprocessor: ColumnTransformer = pipeline.named_steps["preprocess"]
    return preprocessor.get_feature_names_out()


def logistic_coefficients(pipeline: Pipeline, categorical_features: list[str]) -> pd.DataFrame:
    names = encoded_feature_names(pipeline, categorical_features)
    coef = pipeline.named_steps["model"].coef_[0]
    frame = pd.DataFrame({"feature": names, "coefficient": coef})
    frame["abs_coefficient"] = frame["coefficient"].abs()
    return frame.sort_values("abs_coefficient", ascending=False)


def tree_importances(pipeline: Pipeline, categorical_features: list[str]) -> pd.DataFrame:
    names = encoded_feature_names(pipeline, categorical_features)
    importance = pipeline.named_steps["model"].feature_importances_
    frame = pd.DataFrame({"feature": names, "importance": importance})
    return frame.sort_values("importance", ascending=False)


def fmt(value: float) -> str:
    if value != value:
        return "NA"
    return f"{value:.4f}"


def write_markdown_table(rows: list[dict[str, object]], columns: list[str]) -> str:
    header = "| " + " | ".join(columns) + " |"
    divider = "| " + " | ".join("---" if col == "Model" or col == "scheme_id" else "---:" for col in columns) + " |"
    body = []
    for row in rows:
        body.append("| " + " | ".join(str(row[col]) for col in columns) + " |")
    return "\n".join([header, divider, *body])


def train_family(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    feature_columns: list[str],
    categorical_features: list[str],
    label: str,
) -> dict[str, dict[str, object]]:
    assert_no_leakage_columns(feature_columns)
    x_train = train_df[feature_columns]
    x_test = test_df[feature_columns]
    y_train = train_df[TARGET_COLUMN].to_numpy()
    y_test = test_df[TARGET_COLUMN].to_numpy()

    results: dict[str, dict[str, object]] = {}
    for name, estimator in make_models().items():
        scale_numeric = name == "logistic_regression"
        pipeline = Pipeline(
            steps=[
                ("preprocess", make_preprocessor(categorical_features, scale_numeric)),
                ("model", estimator),
            ]
        )
        pipeline.fit(x_train, y_train)
        y_pred = pipeline.predict(x_test)
        if hasattr(pipeline, "predict_proba"):
            y_score = pipeline.predict_proba(x_test)[:, 1]
        else:
            y_score = y_pred.astype(float)
        results[name] = {
            "pipeline": pipeline,
            "y_pred": y_pred,
            "y_score": y_score,
            "overall": metrics_dict(y_test, y_pred, y_score),
            "per_scheme": per_scheme_metrics(test_df, y_test, y_pred, y_score),
            "label": label,
            "scale_numeric": scale_numeric,
        }
    return results


def main() -> int:
    import sklearn

    root = repo_root()
    data_file = dataset_path()
    df = pd.read_csv(data_file)
    df[TARGET_COLUMN] = df[TARGET_COLUMN].astype(int)

    train_df, test_df, train_ids, test_ids = split_by_citizen(df)
    y_test = test_df[TARGET_COLUMN].to_numpy()

    primary = train_family(
        train_df,
        test_df,
        FEATURE_COLUMNS,
        CATEGORICAL_FEATURES,
        "with_scheme_id",
    )
    alternative = train_family(
        train_df,
        test_df,
        FEATURE_COLUMNS_NO_SCHEME,
        CATEGORICAL_FEATURES_NO_SCHEME,
        "without_scheme_id",
    )

    models_dir = root / "ml" / "models" / "baseline"
    eval_dir = root / "ml" / "models" / "evaluation"
    models_dir.mkdir(parents=True, exist_ok=True)
    eval_dir.mkdir(parents=True, exist_ok=True)

    pd.Series(sorted(train_ids), name="citizen_id").to_csv(models_dir / "train_citizen_ids.csv", index=False)
    pd.Series(sorted(test_ids), name="citizen_id").to_csv(models_dir / "test_citizen_ids.csv", index=False)

    for name, payload in primary.items():
        joblib.dump(payload["pipeline"], models_dir / f"{name}.joblib")
        save_confusion_matrix(y_test, payload["y_pred"], eval_dir / f"confusion_matrix_{name}")

    for name, payload in alternative.items():
        joblib.dump(payload["pipeline"], models_dir / f"{name}_no_scheme_id.joblib")

    lr_coef = logistic_coefficients(primary["logistic_regression"]["pipeline"], CATEGORICAL_FEATURES)
    dt_imp = tree_importances(primary["decision_tree"]["pipeline"], CATEGORICAL_FEATURES)
    rf_imp = tree_importances(primary["random_forest"]["pipeline"], CATEGORICAL_FEATURES)
    lr_coef.to_csv(eval_dir / "logistic_regression_coefficients.csv", index=False)
    dt_imp.to_csv(eval_dir / "decision_tree_feature_importance.csv", index=False)
    rf_imp.to_csv(eval_dir / "random_forest_feature_importance.csv", index=False)

    metric_columns = [
        "Model",
        "Accuracy",
        "Precision",
        "Recall",
        "F1",
        "Balanced Accuracy",
        "ROC-AUC",
        "PR-AUC",
    ]
    overall_rows = []
    for name, payload in primary.items():
        overall = payload["overall"]
        overall_rows.append(
            {
                "Model": name,
                "Accuracy": fmt(overall["accuracy"]),
                "Precision": fmt(overall["precision"]),
                "Recall": fmt(overall["recall"]),
                "F1": fmt(overall["f1"]),
                "Balanced Accuracy": fmt(overall["balanced_accuracy"]),
                "ROC-AUC": fmt(overall["roc_auc"]),
                "PR-AUC": fmt(overall["pr_auc"]),
            }
        )
    alt_rows = []
    for name, payload in alternative.items():
        overall = payload["overall"]
        alt_rows.append(
            {
                "Model": f"{name} (no scheme_id)",
                "Accuracy": fmt(overall["accuracy"]),
                "Precision": fmt(overall["precision"]),
                "Recall": fmt(overall["recall"]),
                "F1": fmt(overall["f1"]),
                "Balanced Accuracy": fmt(overall["balanced_accuracy"]),
                "ROC-AUC": fmt(overall["roc_auc"]),
                "PR-AUC": fmt(overall["pr_auc"]),
            }
        )

    best_name = max(primary, key=lambda name: primary[name]["overall"]["f1"])
    dataset_hash = file_sha256(data_file)

    leakage_ok = (
        set(FEATURE_COLUMNS).isdisjoint(LEAKAGE_COLUMNS)
        and set(train_ids).isdisjoint(test_ids)
        and TARGET_COLUMN not in FEATURE_COLUMNS
    )

    results_md = [
        "# Baseline model results",
        "",
        "Phase 4 baseline classifiers on the synthetic CORE eligibility dataset.",
        "Labels were not modified. These scores measure agreement with the rule engine, not real application outcomes.",
        "",
        "## Setup",
        "",
        f"- Dataset: `dataset/processed/eligibility_dataset.csv` (SHA-256 `{dataset_hash}`)",
        f"- Rows: {len(df)}; citizens: {df[ID_COLUMN].nunique()}",
        f"- Train citizens / rows: {len(train_ids)} / {len(train_df)}",
        f"- Test citizens / rows: {len(test_ids)} / {len(test_df)}",
        f"- Split: citizen-grouped, 80/20, seed `{SEED}`, stratified by per-citizen eligible-scheme count",
        f"- Python: {sys.version.split()[0]}",
        f"- scikit-learn: {sklearn.__version__}",
        "",
        "## Overall test metrics (primary: with `scheme_id`)",
        "",
        write_markdown_table(overall_rows, metric_columns),
        "",
        f"Best baseline by F1: **{best_name}**.",
        "",
        "## Overall test metrics (alternative: without `scheme_id`)",
        "",
        write_markdown_table(alt_rows, metric_columns),
        "",
        "`scheme_id` is used in the primary experiment because each row is a citizen–scheme pair and the six CORE rules are different. Without it, the model must infer scheme identity only from how features interact, which is a harder and less appropriate setup for this dataset.",
        "",
        "## Per-scheme test metrics (primary models)",
        "",
    ]
    for name, payload in primary.items():
        results_md.append(f"### {name}")
        results_md.append("")
        scheme_rows = []
        for scheme_id, values in payload["per_scheme"].items():
            scheme_rows.append(
                {
                    "scheme_id": scheme_id,
                    "Accuracy": fmt(values["accuracy"]),
                    "Precision": fmt(values["precision"]),
                    "Recall": fmt(values["recall"]),
                    "F1": fmt(values["f1"]),
                    "Balanced Accuracy": fmt(values["balanced_accuracy"]),
                    "ROC-AUC": fmt(values["roc_auc"]),
                    "PR-AUC": fmt(values["pr_auc"]),
                }
            )
        results_md.append(
            write_markdown_table(
                scheme_rows,
                [
                    "scheme_id",
                    "Accuracy",
                    "Precision",
                    "Recall",
                    "F1",
                    "Balanced Accuracy",
                    "ROC-AUC",
                    "PR-AUC",
                ],
            )
        )
        results_md.append("")

    results_md.extend(
        [
            "## Confusion matrices",
            "",
            "Saved under `ml/models/evaluation/` as `.png`, `.csv`, and `.txt` for each primary model.",
            "",
            "## Limitations",
            "",
            "1. Labels are derived from official CORE rules, not from real applications.",
            "2. Citizen profiles are synthetic.",
            "3. The models are not validated against real government outcomes.",
            "4. High test scores mean the model recovered the rule engine on held-out synthetic citizens.",
            "5. Phase 4 is methodological evaluation and a prototype predictor, not a production eligibility decision system.",
            "",
        ]
    )
    (root / "docs" / "model_baseline_results.md").write_text("\n".join(results_md), encoding="utf-8")

    feature_md = [
        "# Model feature analysis",
        "",
        "These values are **model-derived associations** on synthetic, rule-labelled data.",
        "They are not causal explanations of government policy and do not describe real applicants.",
        "",
        "## Logistic Regression coefficients",
        "",
        "After one-hot encoding and numeric standardisation. Larger absolute coefficient means a stronger association with the predicted log-odds of `eligible=1`.",
        "",
        "| feature | coefficient |",
        "| --- | ---: |",
    ]
    for _, row in lr_coef.head(20).iterrows():
        feature_md.append(f"| `{row['feature']}` | {row['coefficient']:.4f} |")
    feature_md.extend(
        [
            "",
            "## Decision Tree feature importance",
            "",
            "| feature | importance |",
            "| --- | ---: |",
        ]
    )
    for _, row in dt_imp.head(15).iterrows():
        feature_md.append(f"| `{row['feature']}` | {row['importance']:.4f} |")
    feature_md.extend(
        [
            "",
            "## Random Forest feature importance",
            "",
            "| feature | importance |",
            "| --- | ---: |",
        ]
    )
    for _, row in rf_imp.head(15).iterrows():
        feature_md.append(f"| `{row['feature']}` | {row['importance']:.4f} |")
    feature_md.extend(
        [
            "",
            "Full ranked tables: `ml/models/evaluation/logistic_regression_coefficients.csv`,",
            "`decision_tree_feature_importance.csv`, and `random_forest_feature_importance.csv`.",
            "",
        ]
    )
    (root / "docs" / "model_feature_analysis.md").write_text("\n".join(feature_md), encoding="utf-8")

    run_info = {
        "python": sys.version.split()[0],
        "scikit_learn": sklearn.__version__,
        "random_seed": SEED,
        "test_size": TEST_SIZE,
        "dataset": str(data_file.relative_to(root)).replace("\\", "/"),
        "dataset_sha256": dataset_hash,
        "train_citizens": len(train_ids),
        "test_citizens": len(test_ids),
        "train_rows": len(train_df),
        "test_rows": len(test_df),
        "features": FEATURE_COLUMNS,
        "excluded": list(LEAKAGE_COLUMNS),
        "split": "citizen-grouped stratified 80/20",
        "class_weight": "balanced",
        "leakage_checks_passed": leakage_ok,
        "best_baseline_by_f1": best_name,
        "primary_overall": {name: payload["overall"] for name, payload in primary.items()},
        "alternative_overall": {name: payload["overall"] for name, payload in alternative.items()},
    }
    (models_dir / "run_metadata.json").write_text(json.dumps(run_info, indent=2), encoding="utf-8")

    print(f"Train citizens/rows: {len(train_ids)}/{len(train_df)}")
    print(f"Test citizens/rows: {len(test_ids)}/{len(test_df)}")
    print(f"Citizen overlap: {len(set(train_ids) & set(test_ids))}")
    print(f"Best baseline by F1: {best_name}")
    for name, payload in primary.items():
        overall = payload["overall"]
        print(
            f"{name}: acc={overall['accuracy']:.4f} f1={overall['f1']:.4f} "
            f"bal_acc={overall['balanced_accuracy']:.4f} roc={overall['roc_auc']:.4f}"
        )
    print(f"Leakage checks passed: {leakage_ok}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
