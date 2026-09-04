"""Authenticated research summary of existing ML metrics and live API timings."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.db.session import check_database
from app.deps import get_current_user
from app.models.user import UserRecord
from app.schemas.performance import (
    ApiPerformanceSummary,
    EndpointPerformance,
    SystemEvaluationResponse,
    SystemHealth,
)
from app.services.evaluation_service import EvaluationUnavailableError, get_evaluation_service
from app.services.model_service import get_model_service
from app.services.performance_service import get_performance_service
from app.settings import app_environment

router = APIRouter(prefix="/api/v1", tags=["system-evaluation"])

_PROTOTYPE_NOTICE = (
    "Academic Research Prototype. This page measures the existing system. "
    "It is not government accuracy, production monitoring, or an official service."
)
_ML_NOTE = (
    "These ML and hybrid figures come from the existing Phase 4/5 evaluation "
    "artifacts. They are not live API timings and were not recomputed for this request."
)
_API_NOTE = (
    "Live in-process timings for this running API process only. Counters reset "
    "when the process restarts. Request bodies, credentials, tokens, "
    "and wallet fields are not stored."
)


def _health(evaluation_ready: bool) -> SystemHealth:
    database = "connected" if check_database() else "unavailable"
    return SystemHealth(
        status="ok" if database == "connected" else "degraded",
        database=database,
        environment=app_environment(),
        model_loaded=get_model_service().is_loaded(),
        evaluation_ready=evaluation_ready,
    )


@router.get(
    "/system-evaluation",
    response_model=SystemEvaluationResponse,
    summary="Read-only ML evaluation plus live API performance",
    description=(
        "Requires a JWT. Combines existing evaluation artifacts with in-process "
        "API timings. Does not retrain models or return wallet rows."
    ),
)
def read_system_evaluation(
    _current_user: UserRecord = Depends(get_current_user),
) -> SystemEvaluationResponse:
    evaluation = get_evaluation_service()
    try:
        dataset = evaluation.overview()
        models = evaluation.models().models
        hybrid = evaluation.hybrid()
        evaluation_ready = True
    except EvaluationUnavailableError:
        raise
    snapshot = get_performance_service().snapshot()
    return SystemEvaluationResponse(
        prototype_notice=_PROTOTYPE_NOTICE,
        ml_metrics_note=_ML_NOTE,
        api_metrics_note=_API_NOTE,
        dataset=dataset,
        models=models,
        hybrid=hybrid,
        api_performance=ApiPerformanceSummary(
            note=_API_NOTE,
            started_at=str(snapshot["started_at"]),
            endpoints=[EndpointPerformance.model_validate(row) for row in snapshot["endpoints"]],
        ),
        health=_health(evaluation_ready),
    )
