"""Scheme Requirements Registry. Combines catalog text, documented rule conditions and
admin verification metadata. Never decides eligibility and never invents requirements."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from threading import Lock
from typing import Any

from sqlalchemy.exc import InterfaceError, OperationalError
from sqlalchemy.orm import Session

from app.models.scheme_knowledge import SchemeKnowledgeItemRecord
from app.paths import ensure_ml_src_on_path, scheme_requirements_path
from app.schemas.prediction import CitizenProfile
from app.schemas.requirements import (
    ApplicationStep,
    InformationNotChecked,
    OfficialLink,
    RequirementCondition,
    RequirementDocument,
    SchemeRequirements,
    SchemeRequirementsListResponse,
)
from app.services.document_checklist_service import catalog_document_items
from app.services.scheme_service import SchemeRecord, get_scheme_service

ensure_ml_src_on_path()

from ml_config import CORE_SCHEME_IDS  # noqa: E402

NEEDS_VERIFICATION_MARKER = "NEEDS VERIFICATION"
DOCUMENT_KEY_PREFIX = "document:"
STEP_KEY_PREFIX = "step:"
VERIFICATION_STATUSES = frozenset({"verified", "unverified", "missing"})
CONDITION_BASES = frozenset({"official_source", "department_convention", "project_interpretation"})
PROFILE_FIELDS = frozenset(CitizenProfile.model_fields)
_URL = re.compile(r"https?://[^\s,;)]+")


class RequirementsRegistryError(Exception):
    """Raised when the requirements registry file is missing or inconsistent."""


class SchemeRequirementsNotFoundError(Exception):
    """Raised when a scheme is not in the official catalog."""


@dataclass(frozen=True)
class RegistryCondition:
    key: str
    label: str
    profile_fields: tuple[str, ...]
    verification_status: str
    basis: str
    note: str | None


@dataclass(frozen=True)
class RegistryEntry:
    conditions: tuple[RegistryCondition, ...]
    information_not_checked: tuple[InformationNotChecked, ...]


class SchemeRequirementsRegistry:
    def __init__(self, path: Path | None = None) -> None:
        self._path = path
        self._entries: dict[str, RegistryEntry] | None = None
        self._lock = Lock()

    def load(self) -> None:
        with self._lock:
            if self._entries is None:
                self._entries = _parse_registry(self._path or scheme_requirements_path())

    def entries(self) -> dict[str, RegistryEntry]:
        if self._entries is None:
            self.load()
        assert self._entries is not None
        return self._entries

    def entry(self, scheme_id: str) -> RegistryEntry | None:
        return self.entries().get(scheme_id)


def _parse_registry(path: Path) -> dict[str, RegistryEntry]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise RequirementsRegistryError(f"Scheme requirements registry could not be read: {path.name}") from exc
    schemes = payload.get("schemes")
    if not isinstance(schemes, dict):
        raise RequirementsRegistryError("Scheme requirements registry has no 'schemes' object.")
    missing = [scheme_id for scheme_id in CORE_SCHEME_IDS if scheme_id not in schemes]
    if missing:
        raise RequirementsRegistryError(f"Registry is missing CORE schemes: {', '.join(missing)}")
    extra = [scheme_id for scheme_id in schemes if scheme_id not in CORE_SCHEME_IDS]
    if extra:
        raise RequirementsRegistryError(
            f"Registry conditions are only allowed for rule-evaluated CORE schemes: {', '.join(extra)}"
        )
    entries: dict[str, RegistryEntry] = {}
    for scheme_id, raw in schemes.items():
        conditions = tuple(_parse_condition(scheme_id, item) for item in raw.get("conditions") or [])
        if not conditions:
            raise RequirementsRegistryError(f"{scheme_id} has no documented conditions.")
        keys = [condition.key for condition in conditions]
        if len(keys) != len(set(keys)):
            raise RequirementsRegistryError(f"{scheme_id} has duplicate condition keys.")
        info = tuple(_parse_info(scheme_id, item) for item in raw.get("information_not_checked") or [])
        entries[scheme_id] = RegistryEntry(conditions=conditions, information_not_checked=info)
    return entries


def _parse_condition(scheme_id: str, item: dict[str, Any]) -> RegistryCondition:
    try:
        fields = tuple(item["profile_fields"])
        condition = RegistryCondition(
            key=str(item["key"]),
            label=str(item["label"]),
            profile_fields=fields,
            verification_status=str(item["verification_status"]),
            basis=str(item["basis"]),
            note=item.get("note"),
        )
    except (KeyError, TypeError) as exc:
        raise RequirementsRegistryError(f"{scheme_id} has an incomplete condition entry.") from exc
    unknown = [name for name in fields if name not in PROFILE_FIELDS]
    if not fields or unknown:
        raise RequirementsRegistryError(f"{scheme_id}/{condition.key} references unknown profile fields.")
    if condition.verification_status not in VERIFICATION_STATUSES:
        raise RequirementsRegistryError(f"{scheme_id}/{condition.key} has an invalid verification status.")
    if condition.basis not in CONDITION_BASES:
        raise RequirementsRegistryError(f"{scheme_id}/{condition.key} has an invalid basis.")
    if condition.verification_status != "verified" and not condition.note:
        raise RequirementsRegistryError(f"{scheme_id}/{condition.key} must explain why it is not verified.")
    return condition


def _parse_info(scheme_id: str, item: dict[str, Any]) -> InformationNotChecked:
    try:
        return InformationNotChecked(**item)
    except Exception as exc:  # pydantic validation error
        raise RequirementsRegistryError(f"{scheme_id} has an invalid information_not_checked entry.") from exc


_registry = SchemeRequirementsRegistry()


def get_requirements_registry() -> SchemeRequirementsRegistry:
    return _registry


def is_placeholder(text: str | None) -> bool:
    return not text or NEEDS_VERIFICATION_MARKER in text.upper()


def unverified_condition_items(scheme_id: str) -> list[str]:
    """Human-readable notes for documented rule conditions that are not verified."""
    entry = get_requirements_registry().entry(scheme_id)
    if entry is None:
        return []
    return [
        f"{condition.label} ({condition.note})" if condition.note else condition.label
        for condition in entry.conditions
        if condition.verification_status != "verified"
    ]


def document_display_label(label: str) -> str:
    """Drop a catalog list prefix such as 'TNeGA e-Sevai list for CMUPT: ' from the first item."""
    head, sep, tail = label.partition(": ")
    return tail.strip() if sep and tail.strip() and len(head) <= 60 else label


def application_step_texts(application_method: str | None) -> list[str]:
    if not application_method or not application_method.strip():
        return []
    return [part.strip(" .") for part in application_method.split(";") if part.strip(" .")]


def listed_documents(record: SchemeRecord) -> list[tuple[str, str]]:
    """Catalog documents with checklist keys, excluding NEEDS VERIFICATION placeholder text."""
    return [
        (key, label)
        for key, label in catalog_document_items(record.required_documents)
        if not is_placeholder(label)
    ]


def registry_overlay_keys(record: SchemeRecord) -> set[str]:
    """Admin-verifiable registry item keys for one scheme (documents and steps only)."""
    keys = {f"{DOCUMENT_KEY_PREFIX}{key}" for key, _label in listed_documents(record)}
    keys.update(
        f"{STEP_KEY_PREFIX}{index}"
        for index, text in enumerate(application_step_texts(record.application_method), start=1)
        if not is_placeholder(text)
    )
    return keys


def _load_overlays(session: Session | None, scheme_ids: list[str]) -> dict[str, dict[str, SchemeKnowledgeItemRecord]]:
    if session is None or not scheme_ids:
        return {}
    try:
        rows = (
            session.query(SchemeKnowledgeItemRecord)
            .filter(SchemeKnowledgeItemRecord.scheme_id.in_(scheme_ids))
            .all()
        )
    except (OperationalError, InterfaceError):
        return {}
    overlays: dict[str, dict[str, SchemeKnowledgeItemRecord]] = {}
    for row in rows:
        overlays.setdefault(row.scheme_id, {})[row.field_key] = row
    return overlays


def _overlay_meta(
    overlay: SchemeKnowledgeItemRecord | None, default_status: str, default_url: str | None
) -> tuple[str, str | None, str | None]:
    status = default_status
    url = default_url
    verified_at: str | None = None
    if overlay is not None:
        if overlay.verification_status in VERIFICATION_STATUSES:
            status = overlay.verification_status
        if overlay.source_url:
            url = overlay.source_url
        if isinstance(overlay.last_verified_at, datetime):
            verified_at = overlay.last_verified_at.date().isoformat()
    return status, url, verified_at


def _official_links(record: SchemeRecord) -> list[OfficialLink]:
    links: list[OfficialLink] = []
    seen: set[str] = set()

    def add(url: str, origin: str) -> None:
        cleaned = url.rstrip(".")
        if cleaned and cleaned not in seen:
            seen.add(cleaned)
            links.append(OfficialLink(url=cleaned, origin=origin))  # type: ignore[arg-type]

    if record.official_source_url:
        add(record.official_source_url, "official_source_url")
    for origin in ("application_method", "eligibility_notes"):
        for match in _URL.findall(getattr(record, origin) or ""):
            add(match, origin)
    return links


def build_scheme_requirements(
    record: SchemeRecord, overlay: dict[str, SchemeKnowledgeItemRecord] | None = None
) -> SchemeRequirements:
    overlay = overlay or {}
    entry = get_requirements_registry().entry(record.scheme_id)
    conditions = [
        RequirementCondition(
            key=condition.key,
            label=condition.label,
            profile_fields=list(condition.profile_fields),
            verification_status=condition.verification_status,  # type: ignore[arg-type]
            basis=condition.basis,  # type: ignore[arg-type]
            note=condition.note,
        )
        for condition in (entry.conditions if entry else ())
    ]
    required_fields: list[str] = []
    for condition in conditions:
        for name in condition.profile_fields:
            if name not in required_fields:
                required_fields.append(name)

    documents: list[RequirementDocument] = []
    for key, label in listed_documents(record):
        status, url, verified_at = _overlay_meta(
            overlay.get(f"{DOCUMENT_KEY_PREFIX}{key}"), "unverified", record.official_source_url
        )
        documents.append(
            RequirementDocument(
                key=key,
                label=document_display_label(label),
                requirement="unspecified",
                verification_status=status,  # type: ignore[arg-type]
                source_url=url,
                last_verified_at=verified_at,
            )
        )

    steps: list[ApplicationStep] = []
    for index, text in enumerate(application_step_texts(record.application_method), start=1):
        if is_placeholder(text):
            status, url, verified_at = "missing", record.official_source_url, None
        else:
            status, url, verified_at = _overlay_meta(
                overlay.get(f"{STEP_KEY_PREFIX}{index}"), "unverified", record.official_source_url
            )
        steps.append(
            ApplicationStep(
                key=f"{STEP_KEY_PREFIX}{index}",
                order=index,
                text=text,
                verification_status=status,  # type: ignore[arg-type]
                source_url=url,
                last_verified_at=verified_at,
            )
        )

    info = list(entry.information_not_checked) if entry else []
    unverified: list[str] = [
        f"condition: {condition.label}" for condition in conditions if condition.verification_status != "verified"
    ]
    if not documents:
        unverified.append("required documents are not listed on an official source")
    unverified.extend(
        f"document: {document.label}" for document in documents if document.verification_status != "verified"
    )
    if not steps:
        unverified.append("application procedure is not listed on an official source")
    unverified.extend(f"step {step.order}: {step.text}" for step in steps if step.verification_status != "verified")

    return SchemeRequirements(
        scheme_id=record.scheme_id,
        scheme_name=record.scheme_name,
        department=record.department,
        ml_scope=record.ml_scope,
        rule_evaluated=entry is not None,
        rule_status=record.eligibility_rule_status,
        conditions=conditions,
        required_profile_fields=required_fields,
        information_not_checked=info,
        documents_status="listed" if documents else "missing",
        documents=documents,
        application_steps=steps,
        official_source_url=record.official_source_url,
        official_links=_official_links(record),
        eligibility_notes=record.eligibility_notes,
        last_checked=record.source_access_date,
        unverified_items=unverified,
    )


def get_scheme_requirements(session: Session | None, scheme_id: str) -> SchemeRequirements:
    record = get_scheme_service().get_record(scheme_id)
    if record is None:
        raise SchemeRequirementsNotFoundError("No scheme requirements were found for that scheme.")
    overlays = _load_overlays(session, [record.scheme_id])
    return build_scheme_requirements(record, overlays.get(record.scheme_id, {}))


def list_scheme_requirements(session: Session | None, ml_scope: str | None = None) -> SchemeRequirementsListResponse:
    records = get_scheme_service().list_catalog()
    if ml_scope:
        records = [record for record in records if record.ml_scope == ml_scope.strip().upper()]
    overlays = _load_overlays(session, [record.scheme_id for record in records])
    schemes = [build_scheme_requirements(record, overlays.get(record.scheme_id, {})) for record in records]
    return SchemeRequirementsListResponse(scheme_count=len(schemes), schemes=schemes)
