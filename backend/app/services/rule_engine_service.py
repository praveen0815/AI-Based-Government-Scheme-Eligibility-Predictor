"""Documented CORE-scheme rule engine. Reuses ml/src/eligibility_rules.py only."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.paths import ensure_ml_src_on_path
from app.services.scheme_service import get_scheme_service

ensure_ml_src_on_path()

from eligibility_rules import evaluate_scheme  # noqa: E402


@dataclass(frozen=True)
class RuleEvaluation:
    scheme_id: str
    rule_eligible: bool
    rule_reasons: list[str]
    rule_status: str | None
    verification_notes: str | None
    reason_text: str


def _reasons_from_text(eligible: bool, reason: str) -> list[str]:
    prefix = "Eligible: " if eligible else "Not eligible: "
    body = reason[len(prefix) :] if reason.startswith(prefix) else reason
    if body.endswith("."):
        body = body[:-1]
    return [part.strip() for part in body.split(";") if part.strip()]


def evaluate_documented_rule(scheme_id: str, citizen: dict[str, Any]) -> RuleEvaluation:
    """Deterministic documented-rule evaluation. Does not invent conditions."""
    result = evaluate_scheme(scheme_id, citizen)
    record = get_scheme_service().require_core(scheme_id)
    notes = None
    if record.required_documents and "NEEDS VERIFICATION" in record.required_documents:
        notes = "A catalog field is marked NEEDS VERIFICATION and has not been confirmed."
    return RuleEvaluation(
        scheme_id=scheme_id,
        rule_eligible=bool(result.eligible),
        rule_reasons=_reasons_from_text(result.eligible, result.reason),
        rule_status=record.eligibility_rule_status,
        verification_notes=notes,
        reason_text=result.reason,
    )
