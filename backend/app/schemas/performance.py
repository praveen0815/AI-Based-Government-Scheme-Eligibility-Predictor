"""Read-only system evaluation summary. No user, wallet, or secret fields."""

from __future__ import annotations

from pydantic import BaseModel

from app.schemas.evaluation import EvaluationOverview, HybridEvaluationResponse, ModelMetrics


class EndpointPerformance(BaseModel):
    endpoint: str
    request_count: int
    error_count: int
    average_ms: float | None
    min_ms: float | None
    max_ms: float | None


class ApiPerformanceSummary(BaseModel):
    note: str
    started_at: str
    endpoints: list[EndpointPerformance]


class SystemHealth(BaseModel):
    status: str
    database: str
    environment: str
    model_loaded: bool
    evaluation_ready: bool


class SystemEvaluationResponse(BaseModel):
    prototype_notice: str
    ml_metrics_note: str
    api_metrics_note: str
    dataset: EvaluationOverview
    models: list[ModelMetrics]
    hybrid: HybridEvaluationResponse
    api_performance: ApiPerformanceSummary
    health: SystemHealth
