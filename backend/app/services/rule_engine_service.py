"""Documented CORE-scheme rule engine. Reuses ml/src/eligibility_rules.py only."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.paths import ensure_ml_src_on_path
from app.services.scheme_requirements_service import NEEDS_VERIFICATION_MARKER, unverified_condition_items
from app.services.scheme_service import SchemeRecord, get_scheme_service

ensure_ml_src_on_path()

from eligibility_rules import evaluate_scheme  # noqa: E402

CATALOG_FIELD_LABELS: dict[str, str] = {
    "eligibility_notes": "eligibility conditions",
    "required_documents": "required documents",
    "application_method": "application procedure",
    "benefit_description": "benefit details",
}


@dataclass(frozen=True)
class RuleEvaluation:
    scheme_id: str
    rule_eligible: bool
    rule_reasons: list[str]
    rule_status: str | None
    verification_notes: str | None
    reason_text: str
    unverified_items: list[str] = field(default_factory=list)
    condition_checks: list[tuple[bool, str]] = field(default_factory=list)


def _reasons_from_text(eligible: bool, reason: str) -> list[str]:
    prefix = "Eligible: " if eligible else "Not eligible: "
    body = reason[len(prefix) :] if reason.startswith(prefix) else reason
    if body.endswith("."):
        body = body[:-1]
    return [part.strip() for part in body.split(";") if part.strip()]


def unverified_catalog_fields(record: SchemeRecord) -> list[str]:
    """Catalog fields whose text is a NEEDS VERIFICATION placeholder."""
    return [
        key
        for key in CATALOG_FIELD_LABELS
        if NEEDS_VERIFICATION_MARKER in (getattr(record, key, None) or "").upper()
    ]


def unverified_items_for(record: SchemeRecord) -> list[str]:
    items = [CATALOG_FIELD_LABELS[key] for key in unverified_catalog_fields(record)]
    items.extend(unverified_condition_items(record.scheme_id))
    return items


def _verification_notes(items: list[str]) -> str | None:
    if not items:
        return None
    return "Not yet confirmed against an official source: " + "; ".join(items) + "."


def evaluate_documented_rule(scheme_id: str, citizen: dict[str, Any]) -> RuleEvaluation:
    """Deterministic documented-rule evaluation. Does not invent conditions."""
    result = evaluate_scheme(scheme_id, citizen)
    record = get_scheme_service().require_core(scheme_id)
    items = unverified_items_for(record)
    return RuleEvaluation(
        scheme_id=scheme_id,
        rule_eligible=bool(result.eligible),
        rule_reasons=_reasons_from_text(result.eligible, result.reason),
        rule_status=record.eligibility_rule_status,
        verification_notes=_verification_notes(items),
        reason_text=result.reason,
        unverified_items=items,
        condition_checks=list(result.checks),
    )
