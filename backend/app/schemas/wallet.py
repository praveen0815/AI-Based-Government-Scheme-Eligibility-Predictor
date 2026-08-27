"""Pydantic models for the socio-economic data wallet."""

from __future__ import annotations

from datetime import datetime

from pydantic import ConfigDict

from app.schemas.prediction import CitizenProfile
from app.schemas.recommendation import CITIZEN_EXAMPLE


class CitizenWalletCreate(CitizenProfile):
    """Create a wallet. The server generates citizen_id."""

    model_config = ConfigDict(json_schema_extra={"example": CITIZEN_EXAMPLE})


class CitizenWalletUpdate(CitizenProfile):
    """Replace the stored socio-economic attributes."""

    model_config = ConfigDict(json_schema_extra={"example": CITIZEN_EXAMPLE})


class CitizenWalletResponse(CitizenProfile):
    citizen_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                **CITIZEN_EXAMPLE,
                "citizen_id": "11111111-2222-3333-4444-555555555555",
                "created_at": "2026-08-14T12:00:00+00:00",
                "updated_at": "2026-08-14T12:00:00+00:00",
            }
        }
    )
