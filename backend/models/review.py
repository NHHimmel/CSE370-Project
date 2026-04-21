from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class ReviewCreate(BaseModel):
    body: str


class ReviewUpdate(BaseModel):
    body: str


class ReviewResponse(BaseModel):
    review_id: str
    user_id: str
    media_id: str
    body: str
    created_at: datetime
    reviewer_name: str          # FName + LName joined in SQL
    comment_count: int = 0
