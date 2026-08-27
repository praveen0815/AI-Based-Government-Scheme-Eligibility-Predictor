"""Pydantic models for document preparation progress. Not eligibility results."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

DocumentPrepStatus = Literal["not_started", "ready", "needs_verification"]
DocumentItemSource = Literal["catalog", "project_reminder"]

OFFICIAL_SOURCE_ITEM_KEY = "official-source-review"
OFFICIAL_SOURCE_ITEM_LABEL = "Confirm the current document list on the official scheme source"


class DocumentStatusUpdate(BaseModel):
    status: DocumentPrepStatus

    model_config = ConfigDict(json_schema_extra={"example": {"status": "ready"}})


class DocumentChecklistItem(BaseModel):
    item_key: str
    label: str
    source: DocumentItemSource
    status: DocumentPrepStatus
    updated_at: str | None = None


class SchemeDocumentChecklist(BaseModel):
    scheme_id: str
    scheme_name: str
    official_source_url: str | None = None
    documents_need_verification: bool
    required_documents_text: str | None = None
    ready_count: int = Field(..., ge=0)
    item_count: int = Field(..., ge=0)
    progress_percent: int = Field(..., ge=0, le=100)
    has_saved_progress: bool
    items: list[DocumentChecklistItem]
    disclaimer: str


class SchemeDocumentSummary(BaseModel):
    scheme_id: str
    scheme_name: str
    official_source_url: str | None = None
    documents_need_verification: bool
    ready_count: int = Field(..., ge=0)
    item_count: int = Field(..., ge=0)
    progress_percent: int = Field(..., ge=0, le=100)
    has_saved_progress: bool


class DocumentProgressResponse(BaseModel):
    schemes: list[SchemeDocumentSummary]
    schemes_with_progress: int = Field(..., ge=0)
    overall_ready_count: int = Field(..., ge=0)
    overall_item_count: int = Field(..., ge=0)
    overall_progress_percent: int = Field(..., ge=0, le=100)
    disclaimer: str
