from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, field_validator


class UserRegister(BaseModel):
    FName: str
    LName: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    user_id: str
    FName: str
    LName: str
    email: str
    created_at: datetime
    status: str


class UserPublicResponse(BaseModel):
    """Public profile — no email exposed."""
    user_id: str
    FName: str
    LName: str
    created_at: datetime
    status: str


class UserUpdate(BaseModel):
    FName: Optional[str] = None
    LName: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
