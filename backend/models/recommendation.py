from datetime import date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel


class RecommendCreate(BaseModel):
    receiver_id: str    # user_id2
    media_id: str


class RecommendationResponse(BaseModel):
    sender_id: str
    sender_name: str
    receiver_id: str
    receiver_name: str
    media_id: str
    media_title: str
    media_type: str
    release_date: Optional[date] = None
    average_rating: Optional[Decimal] = None
