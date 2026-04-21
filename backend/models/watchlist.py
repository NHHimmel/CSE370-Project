from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, field_validator

VALID_STATUSES = {"plan_to_watch", "watching", "completed", "dropped"}


class WatchlistAdd(BaseModel):
    media_id: str
    status: str = "plan_to_watch"

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(VALID_STATUSES)}")
        return v


class WatchlistUpdate(BaseModel):
    status: str

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            raise ValueError(f"status must be one of: {', '.join(VALID_STATUSES)}")
        return v


class WatchlistItem(BaseModel):
    media_id: str
    title: str
    release_date: Optional[date] = None
    average_rating: Optional[Decimal] = None
    media_type: str
    status: str
    added_at: datetime
