"""Public read-only catalog search. Independent from predict and recommend."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.schemas.catalog import CatalogSearchResponse
from app.services.catalog_search_service import search_catalog
from app.services.scheme_service import CatalogUnavailableError

router = APIRouter(prefix="/api/v1", tags=["catalog"])

_NOTE = (
    "Read-only catalog search from schemes.csv. Does not accept eligibility "
    "results and does not change documented scheme conditions."
)


@router.get(
    "/catalog",
    response_model=CatalogSearchResponse,
    summary="Search and filter the official scheme catalog",
    description=_NOTE,
)
def read_catalog(
    q: str | None = Query(default=None, description="Scheme name or scheme ID text"),
    ml_scope: str | None = Query(default=None, description="CORE, ADVANCED, or HOLD"),
    department: str | None = Query(default=None),
    gender: str | None = Query(
        default=None,
        description="Exact catalog gender_requirement, or unspecified when the field is empty",
    ),
    student: str | None = Query(
        default=None,
        description="Exact catalog student_status_requirement, or unspecified when empty",
    ),
    category: str | None = Query(default=None, description="Catalog scheme_category / benefit type"),
) -> CatalogSearchResponse:
    try:
        return search_catalog(
            q=q,
            ml_scope=ml_scope,
            department=department,
            gender=gender,
            student=student,
            category=category,
        )
    except CatalogUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
