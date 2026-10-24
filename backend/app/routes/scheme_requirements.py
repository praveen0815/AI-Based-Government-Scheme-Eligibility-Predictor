"""Public read-only Scheme Requirements Registry. Does not predict eligibility."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.requirements import SchemeRequirements, SchemeRequirementsListResponse
from app.services.scheme_requirements_service import get_scheme_requirements, list_scheme_requirements

router = APIRouter(prefix="/api/v1", tags=["scheme-requirements"])

_NOTE = (
    "Read-only scheme requirements: documented rule conditions, citizen information the rule "
    "uses, documents and application steps from the official catalog, source links, verification "
    "status and last-checked date. Unverified or missing items are reported, never invented. "
    "This does not calculate eligibility."
)


@router.get(
    "/scheme-requirements",
    response_model=SchemeRequirementsListResponse,
    summary="List requirements for catalog schemes",
    description=_NOTE,
)
def read_scheme_requirements(
    ml_scope: str | None = Query(default=None, description="CORE, ADVANCED, or HOLD"),
    session: Session | None = Depends(get_db),
) -> SchemeRequirementsListResponse:
    return list_scheme_requirements(session, ml_scope=ml_scope)


@router.get(
    "/schemes/{scheme_id}/requirements",
    response_model=SchemeRequirements,
    summary="Return requirements for one catalog scheme",
    description=_NOTE,
)
def read_one_scheme_requirements(
    scheme_id: str,
    session: Session | None = Depends(get_db),
) -> SchemeRequirements:
    return get_scheme_requirements(session, scheme_id)
