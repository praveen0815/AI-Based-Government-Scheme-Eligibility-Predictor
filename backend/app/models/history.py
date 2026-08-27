"""Saved recommendation-history rows. Does not store eligibility decisions."""

from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RecommendationHistoryRecord(Base):
    __tablename__ = "recommendation_history"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utc_now, nullable=False)
    profile_snapshot: Mapped[dict] = mapped_column(JSONB, nullable=False)
    recommended_scheme_ids: Mapped[list] = mapped_column(JSONB, nullable=False)
    recommendation_count: Mapped[int] = mapped_column(Integer, nullable=False)
