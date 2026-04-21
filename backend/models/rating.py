from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, field_validator


class RatingCreate(BaseModel):
    score: Decimal

    @field_validator("score")
    @classmethod
    def validate_score(cls, v: Decimal) -> Decimal:
        if not (Decimal("0.0") <= v <= Decimal("10.0")):
            raise ValueError("Score must be between 0.0 and 10.0")
        return round(v, 1)


class RatingResponse(BaseModel):
    user_id: str
    media_id: str
    score: Decimal
    rated_at: datetime
