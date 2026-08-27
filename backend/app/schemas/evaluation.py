"""Read-only evaluation dashboard schemas. No user or wallet fields."""

from __future__ import annotations

from pydantic import BaseModel


class EvaluationOverview(BaseModel):
    official_scheme_count: int
    core_scheme_count: int
    dataset_citizen_count: int
    eligibility_record_count: int
    eligible_count: int
    not_eligible_count: int
    eligible_percentage: float
    not_eligible_percentage: float
    train_citizen_count: int
    test_citizen_count: int
    train_row_count: int
    test_row_count: int
    split: str
    selected_model: str
    model_type: str
    synthetic_data: bool = True
    rule_derived_labels: bool = True
    source: dict[str, str]


class ModelMetrics(BaseModel):
    model_key: str
    model: str
    selected: bool
    accuracy: float
    precision: float
    recall: float
    f1: float
    balanced_accuracy: float
    roc_auc: float
    pr_auc: float


class ModelComparisonResponse(BaseModel):
    models: list[ModelMetrics]
    note: str
    source: str


class SchemeDistribution(BaseModel):
    scheme_id: str
    scheme_name: str
    eligible_count: int
    not_eligible_count: int
    eligible_percentage: float
    official_source_url: str | None = None


class SchemeModelMetrics(BaseModel):
    model: str
    scheme_id: str
    accuracy: float
    precision: float
    recall: float
    f1: float
    balanced_accuracy: float
    roc_auc: float
    pr_auc: float


class SchemeEvaluationResponse(BaseModel):
    schemes: list[SchemeDistribution]
    model_performance: list[SchemeModelMetrics]
    note: str
    source: dict[str, str]


class FeatureRow(BaseModel):
    feature: str
    value: float


class FeatureAnalysisResponse(BaseModel):
    decision_tree_importance: list[FeatureRow]
    logistic_regression_coefficients: list[FeatureRow]
    random_forest_importance: list[FeatureRow]
    note: str
    source: dict[str, str]


class ConfusionMatrixRow(BaseModel):
    model: str
    true_negative: int
    false_positive: int
    false_negative: int
    true_positive: int


class ConfusionMatrixResponse(BaseModel):
    matrices: list[ConfusionMatrixRow]
    note: str
    source: str


class LimitationItem(BaseModel):
    id: str
    title: str
    detail: str


class OfficialSource(BaseModel):
    scheme_id: str
    scheme_name: str
    official_source_url: str | None = None


class HybridEvaluationResponse(BaseModel):
    model: str
    test_citizen_count: int
    test_row_count: int
    agreement_count: int
    disagreement_count: int
    agreement_percentage: float
    note: str
    source: str


class LimitationsResponse(BaseModel):
    prototype_notice: str
    limitations: list[LimitationItem]
    official_sources: list[OfficialSource]
    source: str
