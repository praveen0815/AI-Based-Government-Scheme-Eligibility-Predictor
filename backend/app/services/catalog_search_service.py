"""Filter official catalog rows. Does not score eligibility or invent conditions."""

from __future__ import annotations

from app.schemas.catalog import (
    CATALOG_SEARCH_DISCLAIMER,
    UNSPECIFIED_FILTER,
    CatalogFilterOptions,
    CatalogSearchItem,
    CatalogSearchResponse,
)
from app.services.scheme_service import SchemeRecord, get_scheme_service


def _item(record: SchemeRecord) -> CatalogSearchItem:
    return CatalogSearchItem(
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
        gender_requirement=record.gender_requirement,
        student_status_requirement=record.student_status_requirement,
    )


def _unique(values: list[str | None]) -> list[str]:
    seen: list[str] = []
    for value in values:
        if value and value not in seen:
            seen.append(value)
    return seen


def _matches_optional(actual: str | None, selected: str | None) -> bool:
    if not selected:
        return True
    if selected == UNSPECIFIED_FILTER:
        return actual is None
    return actual == selected


def search_catalog(
    q: str | None = None,
    ml_scope: str | None = None,
    department: str | None = None,
    gender: str | None = None,
    student: str | None = None,
    category: str | None = None,
) -> CatalogSearchResponse:
    records = get_scheme_service().list_catalog()
    needle = (q or "").strip().lower()
    visible: list[SchemeRecord] = []
    for record in records:
        if needle and needle not in record.scheme_name.lower() and needle not in record.scheme_id.lower():
            continue
        if ml_scope and record.ml_scope != ml_scope:
            continue
        if department and (record.department or "") != department:
            continue
        if category and (record.scheme_category or "") != category:
            continue
        if not _matches_optional(record.gender_requirement, gender):
            continue
        if not _matches_optional(record.student_status_requirement, student):
            continue
        visible.append(record)

    return CatalogSearchResponse(
        scheme_count=len(visible),
        total_catalog_count=len(records),
        schemes=[_item(record) for record in visible],
        filters=CatalogFilterOptions(
            ml_scopes=_unique([record.ml_scope for record in records]),
            departments=_unique([record.department for record in records]),
            genders=_unique([record.gender_requirement for record in records]),
            student_statuses=_unique([record.student_status_requirement for record in records]),
            categories=_unique([record.scheme_category for record in records]),
        ),
        disclaimer=CATALOG_SEARCH_DISCLAIMER,
    )
