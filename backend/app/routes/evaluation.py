"""Public read-only evaluation dashboard APIs. No user or wallet data."""

from __future__ import annotations

from fastapi import APIRouter

from app.schemas.evaluation import (
    ConfusionMatrixResponse,
    EvaluationOverview,
    FeatureAnalysisResponse,
    HybridEvaluationResponse,
    LimitationsResponse,
    ModelComparisonResponse,
    SchemeEvaluationResponse,
)
from app.services.evaluation_service import get_evaluation_service

router = APIRouter(prefix="/api/v1/evaluation", tags=["evaluation"])

_NOTE = (
    "Read-only Phase 4/5 research metrics. Synthetic rule-derived data. "
    "Not government accuracy and not user wallet information."
)


@router.get("/overview", response_model=EvaluationOverview, summary="Dataset and model overview", description=_NOTE)
def evaluation_overview() -> EvaluationOverview:
    return get_evaluation_service().overview()


@router.get("/models", response_model=ModelComparisonResponse, summary="Baseline model comparison", description=_NOTE)
def evaluation_models() -> ModelComparisonResponse:
    return get_evaluation_service().models()


@router.get("/schemes", response_model=SchemeEvaluationResponse, summary="CORE scheme evaluation", description=_NOTE)
def evaluation_schemes() -> SchemeEvaluationResponse:
    return get_evaluation_service().schemes()


@router.get("/features", response_model=FeatureAnalysisResponse, summary="Feature analysis", description=_NOTE)
def evaluation_features() -> FeatureAnalysisResponse:
    return get_evaluation_service().features()


@router.get(
    "/confusion-matrix",
    response_model=ConfusionMatrixResponse,
    summary="Test-set confusion matrices",
    description=_NOTE,
)
def evaluation_confusion() -> ConfusionMatrixResponse:
    return get_evaluation_service().confusion_matrices()


@router.get("/hybrid", response_model=HybridEvaluationResponse, summary="Rule and ML agreement", description=_NOTE)
def evaluation_hybrid() -> HybridEvaluationResponse:
    return get_evaluation_service().hybrid()


@router.get("/limitations", response_model=LimitationsResponse, summary="Research limitations", description=_NOTE)
def evaluation_limitations() -> LimitationsResponse:
    return get_evaluation_service().limitations()
