"""Load the saved Decision Tree pipeline once. Does not retrain."""

from __future__ import annotations

import hashlib
import logging
from threading import Lock

import joblib
from sklearn.pipeline import Pipeline

from app.paths import model_artifact_path, model_artifact_relative

logger = logging.getLogger(__name__)

MODEL_DISPLAY_NAME = "Decision Tree"
MODEL_ARTIFACT_ID = "decision_tree.joblib"


class ModelUnavailableError(Exception):
    """Raised when the saved pipeline cannot be used."""


class ModelService:
    def __init__(self) -> None:
        self._pipeline: Pipeline | None = None
        self._version: str | None = None
        self._lock = Lock()

    def load(self) -> None:
        """Load the artifact once. Safe to call again if already loaded."""
        with self._lock:
            if self._pipeline is not None:
                return
            path = model_artifact_path()
            relative = model_artifact_relative()
            if not path.is_file():
                raise ModelUnavailableError(
                    f"Model artifact not found at '{relative}' under the project root."
                )
            try:
                loaded = joblib.load(path)
            except Exception as exc:
                logger.exception("Failed to load model artifact '%s'", relative)
                raise ModelUnavailableError(
                    "The prediction model artifact is missing or corrupt."
                ) from exc
            if not hasattr(loaded, "predict") or not hasattr(loaded, "predict_proba"):
                raise ModelUnavailableError(
                    "The prediction model artifact is missing or corrupt."
                )
            digest = hashlib.sha256(path.read_bytes()).hexdigest()
            self._pipeline = loaded
            self._version = digest[:16]
            logger.info("Loaded Decision Tree artifact '%s' version %s", relative, self._version)

    def is_loaded(self) -> bool:
        return self._pipeline is not None

    def pipeline(self) -> Pipeline:
        if self._pipeline is None:
            self.load()
        if self._pipeline is None:
            raise ModelUnavailableError("The prediction model is not loaded.")
        return self._pipeline

    def model_version(self) -> str:
        if self._version is None:
            self.load()
        if self._version is None:
            raise ModelUnavailableError("The prediction model is not loaded.")
        return self._version


_service = ModelService()


def get_model_service() -> ModelService:
    return _service
