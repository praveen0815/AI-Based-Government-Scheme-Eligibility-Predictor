"""Read the official scheme catalog from CSV. Does not invent metadata."""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass
from threading import Lock

import pandas as pd

from app.paths import ensure_ml_src_on_path, scheme_catalog_path, scheme_catalog_relative

ensure_ml_src_on_path()

from ml_config import CORE_SCHEME_IDS  # noqa: E402

logger = logging.getLogger(__name__)

CATALOG_FIELDS = (
    "scheme_id",
    "scheme_name",
    "department",
    "scheme_category",
    "description",
    "benefit_description",
    "required_documents",
    "application_method",
    "official_source_url",
    "eligibility_notes",
    "ml_scope",
    "eligibility_rule_status",
)


class CatalogUnavailableError(Exception):
    """Raised when the official catalog cannot be used."""


def _catalog_text(value: object) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    text = str(value).strip()
    if text == "" or text.lower() == "nan":
        return None
    return text


@dataclass(frozen=True)
class SchemeRecord:
    scheme_id: str
    scheme_name: str
    department: str | None
    scheme_category: str | None
    description: str | None
    benefit_description: str | None
    required_documents: str | None
    application_method: str | None
    official_source_url: str | None
    eligibility_notes: str | None
    ml_scope: str
    eligibility_rule_status: str | None


class SchemeService:
    def __init__(self) -> None:
        self._by_id: dict[str, SchemeRecord] = {}
        self._lock = Lock()

    def load(self) -> None:
        with self._lock:
            if self._by_id:
                return
            path = scheme_catalog_path()
            relative = scheme_catalog_relative()
            if not path.is_file():
                raise CatalogUnavailableError(
                    f"Scheme catalog not found at '{relative}' under the project root."
                )
            try:
                frame = pd.read_csv(path, dtype=str, keep_default_na=False)
            except Exception as exc:
                logger.exception("Failed to read scheme catalog '%s'", relative)
                raise CatalogUnavailableError(
                    "The official scheme catalog could not be read."
                ) from exc
            missing_columns = [column for column in CATALOG_FIELDS if column not in frame.columns]
            if missing_columns:
                raise CatalogUnavailableError(
                    "The official scheme catalog is missing required columns."
                )
            records: dict[str, SchemeRecord] = {}
            for row in frame.to_dict(orient="records"):
                scheme_id = _catalog_text(row.get("scheme_id"))
                scheme_name = _catalog_text(row.get("scheme_name"))
                ml_scope = _catalog_text(row.get("ml_scope"))
                if not scheme_id or not scheme_name or not ml_scope:
                    raise CatalogUnavailableError(
                        "The official scheme catalog has a row with missing identity fields."
                    )
                records[scheme_id] = SchemeRecord(
                    scheme_id=scheme_id,
                    scheme_name=scheme_name,
                    department=_catalog_text(row.get("department")),
                    scheme_category=_catalog_text(row.get("scheme_category")),
                    description=_catalog_text(row.get("description")),
                    benefit_description=_catalog_text(row.get("benefit_description")),
                    required_documents=_catalog_text(row.get("required_documents")),
                    application_method=_catalog_text(row.get("application_method")),
                    official_source_url=_catalog_text(row.get("official_source_url")),
                    eligibility_notes=_catalog_text(row.get("eligibility_notes")),
                    ml_scope=ml_scope,
                    eligibility_rule_status=_catalog_text(row.get("eligibility_rule_status")),
                )
            for scheme_id in CORE_SCHEME_IDS:
                record = records.get(scheme_id)
                if record is None:
                    raise CatalogUnavailableError(
                        f"CORE scheme {scheme_id} is missing from the official catalog."
                    )
                if record.ml_scope != "CORE":
                    raise CatalogUnavailableError(
                        f"Scheme {scheme_id} is not marked CORE in the official catalog."
                    )
            self._by_id = records
            logger.info("Loaded scheme catalog '%s' with %s rows", relative, len(records))

    def require_core(self, scheme_id: str) -> SchemeRecord:
        if not self._by_id:
            self.load()
        record = self._by_id.get(scheme_id)
        if record is None:
            raise CatalogUnavailableError(
                f"Scheme {scheme_id} is missing from the official catalog."
            )
        if record.ml_scope != "CORE":
            raise CatalogUnavailableError(f"Scheme {scheme_id} is not a CORE scheme.")
        return record

    def ml_core_schemes(self) -> list[SchemeRecord]:
        return [self.require_core(scheme_id) for scheme_id in CORE_SCHEME_IDS]

    def catalog_count(self) -> int:
        if not self._by_id:
            self.load()
        return len(self._by_id)


_service = SchemeService()


def get_scheme_service() -> SchemeService:
    return _service
