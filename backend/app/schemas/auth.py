"""Pydantic models for academic prototype authentication."""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=128)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "full_name": "Praveen Kumar",
                "email": "user@example.com",
                "password": "password123",
            }
        }
    )


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., min_length=1, max_length=16384)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "credential": "google-id-token",
            }
        }
    )


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1, max_length=128)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "user@example.com",
                "password": "password123",
            }
        }
    )


class UpdateProfileRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=200)

    model_config = ConfigDict(
        json_schema_extra={"example": {"full_name": "Praveen Kumar"}}
    )


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "current_password": "password123",
                "new_password": "newpassword123",
            }
        }
    )


class UserPublic(BaseModel):
    user_id: str
    full_name: str
    email: EmailStr
    has_password: bool = False
    has_google: bool = False
    is_admin: bool = False
    created_at: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserPublic
