"""Multi-scheme recommendation and CORE catalog routes."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas.recommendation import (
    RecommendRequest,
    RecommendResponse,
    SchemeCatalogItem,
    SchemeCatalogResponse,
)
from app.services.model_service import ModelUnavailableError
from app.services.recommendation_service import recommend_for_citizen
from app.services.scheme_service import CatalogUnavailableError, get_scheme_service

router = APIRouter(prefix="/api/v1")


def _catalog_item(record) -> SchemeCatalogItem:
    return SchemeCatalogItem(
        scheme_id=record.scheme_id,
        scheme_name=record.scheme_name,
        department=record.department,
        scheme_category=record.scheme_category,
        description=record.description,
        benefit_description=record.benefit_description,
        required_documents=record.required_documents,
        application_method=record.application_method,
        official_source_url=record.official_source_url,
        eligibility_notes=record.eligibility_notes,
        ml_scope=record.ml_scope,
        eligibility_rule_status=record.eligibility_rule_status,
    )


@router.get("/schemes", response_model=SchemeCatalogResponse)
def list_core_schemes() -> SchemeCatalogResponse:
    try:
        schemes = get_scheme_service().ml_core_schemes()
    except CatalogUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return SchemeCatalogResponse(
        scheme_count=len(schemes),
        schemes=[_catalog_item(record) for record in schemes],
    )


@router.post("/recommend", response_model=RecommendResponse)
def recommend(payload: RecommendRequest) -> RecommendResponse:
    try:
        return recommend_for_citizen(payload.to_citizen_features())
    except ModelUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except CatalogUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
