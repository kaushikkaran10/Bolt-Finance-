"""
NovaX — Auth Schemas (Pydantic)
Request/response models for authentication endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, constr


# --- Requests ---

class RegisterRequest(BaseModel):
    email: constr(pattern=r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)")
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)


class LoginRequest(BaseModel):
    email: constr(pattern=r"(^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$)")
    password: str


class Web3AuthRequest(BaseModel):
    address: str = Field(..., pattern=r"^0x[a-fA-F0-9]{40}$")
    signature: str
    message: str = "Sign in to NovaX"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# --- Responses ---

class UserResponse(BaseModel):
    id: str
    email: Optional[str] = None
    username: str
    wallet_address: Optional[str] = None
    firebase_uid: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse
