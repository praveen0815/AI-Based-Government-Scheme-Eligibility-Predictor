"""Public scheme knowledge retrieval. Does not predict eligibility."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.scheme_knowledge import SchemeKnowledgeListResponse, SchemeKnowledgeRecord
from app.services.scheme_knowledge_service import get_scheme_knowledge, list_scheme_knowledge

router = APIRouter(prefix="/api/v1/scheme-knowledge", tags=["scheme-knowledge"])

_NOTE = (
    "Read-only retrieval of official catalog text plus admin verification metadata. "
    "This does not calculate eligibility or change Hybrid Rule + ML results."
)


@router.get(
    "",
    response_model=SchemeKnowledgeListResponse,
    summary="Search verified scheme knowledge records",
    description=_NOTE,
)
def read_scheme_knowledge(
    q: str | None = Query(default=None, description="Search scheme ID, name, or catalog text"),
    scheme_id: str | None = Query(default=None),
    department: str | None = Query(default=None),
    category: str | None = Query(default=None, description="Catalog scheme_category"),
    session: Session | None = Depends(get_db),
) -> SchemeKnowledgeListResponse:
    return list_scheme_knowledge(
        session,
        q=q,
        scheme_id=scheme_id,
        department=department,
        category=category,
    )


@router.get(
    "/{scheme_id}",
    response_model=SchemeKnowledgeRecord,
    summary="Return knowledge items for one official catalog scheme",
    description=_NOTE,
)
def read_scheme_knowledge_item(
    scheme_id: str,
    session: Session | None = Depends(get_db),
) -> SchemeKnowledgeRecord:
    return get_scheme_knowledge(session, scheme_id)
