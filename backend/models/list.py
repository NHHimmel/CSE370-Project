from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel


class CustomListCreate(BaseModel):
    title: str
    description: Optional[str] = None
    is_public: bool = True


class CustomListUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None


class CustomListResponse(BaseModel):
    list_id: str
    user_id: str
    title: str
    description: Optional[str] = None
    is_public: bool
    created_at: datetime
    item_count: int = 0


class ListItemAdd(BaseModel):
    media_id: str
    list_rank: Optional[int] = None


class ListItemResponse(BaseModel):
    media_id: str
    title: str
    release_date: Optional[date] = None
    average_rating: Optional[Decimal] = None
    media_type: str
    list_rank: Optional[int] = None
    added_at: datetime


class CustomListWithItems(BaseModel):
    list_id: str
    user_id: str
    title: str
    description: Optional[str] = None
    is_public: bool
    created_at: datetime
    items: List[ListItemResponse] = []
