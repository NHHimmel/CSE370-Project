import math
from datetime import date
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, computed_field


class MediaSummary(BaseModel):
    """Lightweight card used in list/search responses."""
    media_id: str
    title: str
    release_date: Optional[date] = None
    average_rating: Optional[Decimal] = None
    media_type: str          # "movie" | "tv" | "anime"
    genres: List[str] = []
    poster_url: Optional[str] = None


class MediaDetail(BaseModel):
    """Full detail view — all subtype fields present, unused ones are None."""
    media_id: str
    title: str
    release_date: Optional[date] = None
    synopsis: Optional[str] = None
    average_rating: Optional[Decimal] = None
    media_type: str
    genres: List[str] = []
    poster_url: Optional[str] = None

    # Movie
    runtime: Optional[int] = None          # minutes
    box_office: Optional[Decimal] = None
    tags: List[str] = []

    # TV Series
    total_seasons: Optional[int] = None
    tv_status: Optional[str] = None

    # Anime
    source_material: Optional[str] = None
    total_episodes: Optional[int] = None


class PaginatedMedia(BaseModel):
    items: List[MediaSummary]
    total: int
    page: int
    limit: int
    pages: int
