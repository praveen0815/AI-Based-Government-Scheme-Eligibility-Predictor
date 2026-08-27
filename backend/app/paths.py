"""Project-root and ML import paths. No machine-specific absolute paths."""

from __future__ import annotations

import os
import sys
from pathlib import Path

DEFAULT_MODEL_ARTIFACT = "ml/models/baseline/decision_tree.joblib"
DEFAULT_SCHEME_CATALOG = "dataset/raw/schemes.csv"
DEFAULT_RUN_METADATA = "ml/models/baseline/run_metadata.json"
DEFAULT_ELIGIBILITY_DATASET = "dataset/processed/eligibility_dataset.csv"
DEFAULT_EVALUATION_DIR = "ml/models/evaluation"
DEFAULT_BASELINE_RESULTS = "docs/model_baseline_results.md"


def project_root() -> Path:
    here = Path(__file__).resolve()
    for parent in here.parents:
        if (parent / "ml" / "src").is_dir() and (parent / "backend" / "app").is_dir():
            return parent
    raise RuntimeError(
        "Could not locate the project root. Expected folders ml/src and backend/app."
    )


def ensure_ml_src_on_path() -> Path:
    ml_src = project_root() / "ml" / "src"
    text = str(ml_src)
    if text not in sys.path:
        sys.path.insert(0, text)
    return ml_src


def model_artifact_relative() -> str:
    return os.environ.get("MODEL_ARTIFACT_PATH", DEFAULT_MODEL_ARTIFACT)


def model_artifact_path() -> Path:
    relative = Path(model_artifact_relative())
    if relative.is_absolute():
        return relative
    return (project_root() / relative).resolve()


def scheme_catalog_relative() -> str:
    return os.environ.get("SCHEME_CATALOG_PATH", DEFAULT_SCHEME_CATALOG)


def scheme_catalog_path() -> Path:
    relative = Path(scheme_catalog_relative())
    if relative.is_absolute():
        return relative
    return (project_root() / relative).resolve()


def run_metadata_path() -> Path:
    return project_root() / DEFAULT_RUN_METADATA


def eligibility_dataset_path() -> Path:
    return project_root() / DEFAULT_ELIGIBILITY_DATASET


def evaluation_dir() -> Path:
    return project_root() / DEFAULT_EVALUATION_DIR


def baseline_results_path() -> Path:
    return project_root() / DEFAULT_BASELINE_RESULTS
