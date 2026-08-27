"""Read-only prediction and model-info routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.paths import ensure_ml_src_on_path
from app.schemas.prediction import (
    API_DISCLAIMER,
    ModelInfoResponse,
    PredictionRequest,
    PredictionResponse,
    RuleResultPayload,
)
from app.services.hybrid_prediction_service import compare_rule_and_ml
from app.services.model_service import (
    MODEL_ARTIFACT_ID,
    MODEL_DISPLAY_NAME,
    ModelUnavailableError,
    get_model_service,
)

ensure_ml_src_on_path()

from ml_config import CORE_SCHEME_IDS  # noqa: E402

router = APIRouter(prefix="/api/v1")


@router.get("/model-info", response_model=ModelInfoResponse)
def model_info() -> ModelInfoResponse:
    service = get_model_service()
    try:
        version = service.model_version()
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return ModelInfoResponse(
        model_name=MODEL_DISPLAY_NAME,
        supported_scheme_count=len(CORE_SCHEME_IDS),
        supported_scheme_ids=list(CORE_SCHEME_IDS),
        model_artifact=MODEL_ARTIFACT_ID,
        model_version=version,
    )


@router.post("/predict", response_model=PredictionResponse)
def predict(payload: PredictionRequest) -> PredictionResponse:
    try:
        get_model_service().pipeline()
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    citizen = payload.to_citizen_features()
    hybrid = compare_rule_and_ml(payload.scheme_id, citizen)
    return PredictionResponse(
        scheme_id=payload.scheme_id,
        prediction=hybrid.reference_prediction,
        eligible_probability=hybrid.eligible_probability,
        not_eligible_probability=hybrid.not_eligible_probability,
        explanation=hybrid.explanation,
        model_name=MODEL_DISPLAY_NAME,
        disclaimer=API_DISCLAIMER,
        rule_result=RuleResultPayload(
            eligible=hybrid.rule.rule_eligible,
            reasons=hybrid.rule.rule_reasons,
            rule_status=hybrid.rule.rule_status,
            verification_notes=hybrid.rule.verification_notes,
        ),
        rule_reasons=hybrid.rule.rule_reasons,
        ml_prediction=hybrid.ml_prediction,
        agreement=hybrid.agreement,
    )
