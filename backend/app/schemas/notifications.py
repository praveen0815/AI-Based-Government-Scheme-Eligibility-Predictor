"""Pydantic models for owner-only research-prototype reminders."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

NotificationType = Literal[
    "profile_incomplete",
    "document_attention",
    "readiness_in_progress",
    "recommendation",
    "eligibility_incomplete",
    "application_status",
]

RelatedFeature = Literal["wallet", "documents", "readiness", "history", "applications"]

NOTIFICATION_DISCLAIMER = (
    "These reminders are generated from your research-prototype activity only. "
    "They are not government notices, official deadlines, or application updates."
)


class NotificationItem(BaseModel):
    notification_id: str
    type: NotificationType
    title: str
    message: str
    related_feature: RelatedFeature
    related_id: str | None = None
    href: str
    is_read: bool
    created_at: str
    count: int | None = None


class NotificationListResponse(BaseModel):
    notifications: list[NotificationItem]
    unread_count: int = Field(..., ge=0)
    disclaimer: str
