"""Thin wrapper around the existing ML explanation module. No LLM."""

from __future__ import annotations

from typing import Any

from sklearn.pipeline import Pipeline

from app.paths import ensure_ml_src_on_path

ensure_ml_src_on_path()

from explanation import explain_prediction  # noqa: E402


def explain_citizen_prediction(
    citizen: dict[str, Any],
    scheme_id: str,
    pipeline: Pipeline,
) -> dict[str, Any]:
    """Reuse ml/src/explanation.py without rewriting the explanation logic."""
    return explain_prediction(
        citizen=citizen,
        scheme_id=scheme_id,
        pipeline=pipeline,
        model_name="decision_tree",
    )
