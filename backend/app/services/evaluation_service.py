"""Read-only Phase 4/5 evaluation artifacts. Does not train or score wallets."""

from __future__ import annotations

import json
from threading import Lock

import pandas as pd

from app.paths import eligibility_dataset_path, evaluation_dir, run_metadata_path
from app.schemas.evaluation import (
    ConfusionMatrixResponse,
    ConfusionMatrixRow,
    EvaluationOverview,
    FeatureAnalysisResponse,
    FeatureRow,
    HybridEvaluationResponse,
    LimitationItem,
    LimitationsResponse,
    ModelComparisonResponse,
    ModelMetrics,
    OfficialSource,
    SchemeDistribution,
    SchemeEvaluationResponse,
    SchemeModelMetrics,
)
from app.services.scheme_service import get_scheme_service

MODEL_LABELS = {
    "logistic_regression": "Logistic Regression",
    "decision_tree": "Decision Tree",
    "random_forest": "Random Forest",
}

# Per-scheme primary test metrics copied from docs/model_baseline_results.md.
# These are Phase 4 test-set scores, not eligibility counts.
PER_SCHEME_MODEL_METRICS: dict[str, dict[str, dict[str, float]]] = {
    "logistic_regression": {
        "TN-SW-001": {"accuracy": 0.8560, "precision": 0.3825, "recall": 0.8925, "f1": 0.5355, "balanced_accuracy": 0.8724, "roc_auc": 0.9198, "pr_auc": 0.4414},
        "TN-SW-002": {"accuracy": 0.6800, "precision": 0.1382, "recall": 0.4200, "f1": 0.2079, "balanced_accuracy": 0.5644, "roc_auc": 0.7168, "pr_auc": 0.1599},
        "TN-SW-004": {"accuracy": 0.8330, "precision": 0.2246, "recall": 0.6562, "f1": 0.3347, "balanced_accuracy": 0.7507, "roc_auc": 0.8734, "pr_auc": 0.3392},
        "TN-SW-006": {"accuracy": 0.7780, "precision": 0.1757, "recall": 0.5000, "f1": 0.2600, "balanced_accuracy": 0.6508, "roc_auc": 0.8329, "pr_auc": 0.3569},
        "TN-REV-001": {"accuracy": 0.5030, "precision": 0.4053, "recall": 0.9971, "f1": 0.5763, "balanced_accuracy": 0.6233, "roc_auc": 0.5761, "pr_auc": 0.3729},
        "TN-REV-002": {"accuracy": 0.7710, "precision": 0.0981, "recall": 0.3684, "f1": 0.1550, "balanced_accuracy": 0.5819, "roc_auc": 0.6739, "pr_auc": 0.0824},
    },
    "decision_tree": {
        "TN-SW-001": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
        "TN-SW-002": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
        "TN-SW-004": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
        "TN-SW-006": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
        "TN-REV-001": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
        "TN-REV-002": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
    },
    "random_forest": {
        "TN-SW-001": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
        "TN-SW-002": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
        "TN-SW-004": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
        "TN-SW-006": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
        "TN-REV-001": {"accuracy": 0.9950, "precision": 0.9855, "recall": 1.0, "f1": 0.9927, "balanced_accuracy": 0.9962, "roc_auc": 1.0, "pr_auc": 1.0},
        "TN-REV-002": {"accuracy": 1.0, "precision": 1.0, "recall": 1.0, "f1": 1.0, "balanced_accuracy": 1.0, "roc_auc": 1.0, "pr_auc": 1.0},
    },
}


class EvaluationUnavailableError(Exception):
    """Raised when Phase 4/5 evaluation files cannot be read."""


def _round_pct(value: float) -> float:
    return round(value, 2)


class EvaluationService:
    def __init__(self) -> None:
        self._lock = Lock()
        self._metadata: dict | None = None
        self._scheme_counts: dict[str, tuple[int, int]] | None = None
        self._totals: tuple[int, int, int] | None = None

    def load(self) -> None:
        with self._lock:
            if self._metadata is not None:
                return
            path = run_metadata_path()
            if not path.is_file():
                raise EvaluationUnavailableError(
                    "Phase 4 run metadata was not found under ml/models/baseline/."
                )
            self._metadata = json.loads(path.read_text(encoding="utf-8"))
            self._load_dataset_counts()

    def _load_dataset_counts(self) -> None:
        data_path = eligibility_dataset_path()
        if not data_path.is_file():
            raise EvaluationUnavailableError(
                "The labelled eligibility dataset was not found."
            )
        frame = pd.read_csv(data_path, usecols=["citizen_id", "scheme_id", "eligible"])
        eligible = int((frame["eligible"] == 1).sum())
        total = int(len(frame))
        citizens = int(frame["citizen_id"].nunique())
        self._totals = (citizens, eligible, total - eligible)
        counts: dict[str, tuple[int, int]] = {}
        for scheme_id, group in frame.groupby("scheme_id"):
            yes = int((group["eligible"] == 1).sum())
            counts[str(scheme_id)] = (yes, int(len(group)) - yes)
        self._scheme_counts = counts

    def _require(self) -> dict:
        if self._metadata is None:
            self.load()
        assert self._metadata is not None
        return self._metadata

    def overview(self) -> EvaluationOverview:
        metadata = self._require()
        assert self._totals is not None
        citizens, eligible, not_eligible = self._totals
        total = eligible + not_eligible
        catalog = get_scheme_service()
        return EvaluationOverview(
            official_scheme_count=catalog.catalog_count(),
            core_scheme_count=6,
            dataset_citizen_count=citizens,
            eligibility_record_count=total,
            eligible_count=eligible,
            not_eligible_count=not_eligible,
            eligible_percentage=_round_pct(100 * eligible / total),
            not_eligible_percentage=_round_pct(100 * not_eligible / total),
            train_citizen_count=int(metadata["train_citizens"]),
            test_citizen_count=int(metadata["test_citizens"]),
            train_row_count=int(metadata["train_rows"]),
            test_row_count=int(metadata["test_rows"]),
            split=str(metadata["split"]),
            selected_model="Decision Tree",
            model_type="Decision Tree",
            source={
                "dataset": "dataset/processed/eligibility_dataset.csv",
                "metrics": "ml/models/baseline/run_metadata.json",
                "catalog": "dataset/raw/schemes.csv",
            },
        )

    def models(self) -> ModelComparisonResponse:
        metadata = self._require()
        primary = metadata["primary_overall"]
        models = []
        for key, label in MODEL_LABELS.items():
            values = primary[key]
            models.append(
                ModelMetrics(
                    model_key=key,
                    model=label,
                    selected=key == "decision_tree",
                    accuracy=float(values["accuracy"]),
                    precision=float(values["precision"]),
                    recall=float(values["recall"]),
                    f1=float(values["f1"]),
                    balanced_accuracy=float(values["balanced_accuracy"]),
                    roc_auc=float(values["roc_auc"]),
                    pr_auc=float(values["pr_auc"]),
                )
            )
        return ModelComparisonResponse(
            models=models,
            note=(
                "These scores measure agreement with the rule engine on held-out "
                "synthetic citizens. They are not government accuracy."
            ),
            source="ml/models/baseline/run_metadata.json",
        )

    def schemes(self) -> SchemeEvaluationResponse:
        self._require()
        assert self._scheme_counts is not None
        catalog = get_scheme_service()
        distributions = []
        performance = []
        for record in catalog.ml_core_schemes():
            yes, no = self._scheme_counts[record.scheme_id]
            total = yes + no
            distributions.append(
                SchemeDistribution(
                    scheme_id=record.scheme_id,
                    scheme_name=record.scheme_name,
                    eligible_count=yes,
                    not_eligible_count=no,
                    eligible_percentage=_round_pct(100 * yes / total),
                    official_source_url=record.official_source_url,
                )
            )
            for key, label in MODEL_LABELS.items():
                values = PER_SCHEME_MODEL_METRICS[key][record.scheme_id]
                performance.append(
                    SchemeModelMetrics(model=label, scheme_id=record.scheme_id, **values)
                )
        return SchemeEvaluationResponse(
            schemes=distributions,
            model_performance=performance,
            note=(
                "Eligible counts are synthetic rule-derived labels. "
                "Model performance is a separate Phase 4 test-set comparison."
            ),
            source={
                "distribution": "dataset/processed/eligibility_dataset.csv",
                "model_performance": "docs/model_baseline_results.md",
                "catalog": "dataset/raw/schemes.csv",
            },
        )

    def features(self) -> FeatureAnalysisResponse:
        self._require()
        eval_path = evaluation_dir()
        dt = pd.read_csv(eval_path / "decision_tree_feature_importance.csv")
        rf = pd.read_csv(eval_path / "random_forest_feature_importance.csv")
        lr = pd.read_csv(eval_path / "logistic_regression_coefficients.csv")
        return FeatureAnalysisResponse(
            decision_tree_importance=[
                FeatureRow(feature=str(row.feature), value=float(row.importance))
                for row in dt.itertuples(index=False)
            ],
            logistic_regression_coefficients=[
                FeatureRow(feature=str(row.feature), value=float(row.coefficient))
                for row in lr.itertuples(index=False)
            ],
            random_forest_importance=[
                FeatureRow(feature=str(row.feature), value=float(row.importance))
                for row in rf.itertuples(index=False)
            ],
            note=(
                "These are model associations and importance measures, not causal "
                "relationships and not government policy weights."
            ),
            source={
                "decision_tree": "ml/models/evaluation/decision_tree_feature_importance.csv",
                "logistic_regression": "ml/models/evaluation/logistic_regression_coefficients.csv",
                "random_forest": "ml/models/evaluation/random_forest_feature_importance.csv",
            },
        )

    def confusion_matrices(self) -> ConfusionMatrixResponse:
        self._require()
        eval_path = evaluation_dir()
        matrices = []
        for key, label in MODEL_LABELS.items():
            frame = pd.read_csv(eval_path / f"confusion_matrix_{key}.csv", index_col=0)
            matrices.append(
                ConfusionMatrixRow(
                    model=label,
                    true_negative=int(frame.loc["true_0", "pred_0"]),
                    false_positive=int(frame.loc["true_0", "pred_1"]),
                    false_negative=int(frame.loc["true_1", "pred_0"]),
                    true_positive=int(frame.loc["true_1", "pred_1"]),
                )
            )
        return ConfusionMatrixResponse(
            matrices=matrices,
            note="Confusion matrices are from the Phase 4 citizen-grouped test set (1,000 citizens, 6,000 rows).",
            source="ml/models/evaluation/confusion_matrix_*.csv",
        )

    def hybrid(self) -> HybridEvaluationResponse:
        """Phase 5 Decision Tree vs documented-rule agreement on the held-out test set.

        Values are taken from docs/rule_vs_ml_comparison.md. Nothing is retrained.
        """
        return HybridEvaluationResponse(
            model="Decision Tree",
            test_citizen_count=1000,
            test_row_count=6000,
            agreement_count=6000,
            disagreement_count=0,
            agreement_percentage=100.0,
            note=(
                "Agreement with documented rule-derived labels on synthetic research data. "
                "The Decision Tree reproduced the documented rule engine on the held-out "
                "test set (1,000 citizens, 6,000 citizen–scheme rows). This is not "
                "government approval accuracy."
            ),
            source="docs/rule_vs_ml_comparison.md",
        )

    def limitations(self) -> LimitationsResponse:
        catalog = get_scheme_service()
        sources = [
            OfficialSource(
                scheme_id=record.scheme_id,
                scheme_name=record.scheme_name,
                official_source_url=record.official_source_url,
            )
            for record in catalog.ml_core_schemes()
        ]
        return LimitationsResponse(
            prototype_notice="This system is an academic AI research prototype.",
            limitations=[
                LimitationItem(
                    id="synthetic",
                    title="Synthetic citizens",
                    detail="The citizen dataset is synthetic. It is not a sample of Tamil Nadu residents.",
                ),
                LimitationItem(
                    id="rule_labels",
                    title="Rule-derived labels",
                    detail="Eligibility labels are derived from documented scheme rules, not real applications.",
                ),
                LimitationItem(
                    id="no_outcomes",
                    title="No real government outcomes",
                    detail="The model has not been validated against real government application outcomes.",
                ),
                LimitationItem(
                    id="perfect_tree",
                    title="Near-perfect tree scores are expected",
                    detail="The Decision Tree receives the same inputs the rule engine used, so a 1.0 test score is a consistency check, not field skill.",
                ),
                LimitationItem(
                    id="probabilities",
                    title="Probabilities are not government certainty",
                    detail="Model probabilities are not government approval or a final eligibility determination.",
                ),
                LimitationItem(
                    id="core_only",
                    title="CORE schemes only",
                    detail="Only six CORE schemes are scored. ADVANCED and HOLD catalog rows are excluded.",
                ),
                LimitationItem(
                    id="verify",
                    title="Verify official information",
                    detail="Official scheme information should always be verified with the respective government department.",
                ),
            ],
            official_sources=sources,
            source="docs/ml_limitations.md",
        )


_service = EvaluationService()


def get_evaluation_service() -> EvaluationService:
    return _service
