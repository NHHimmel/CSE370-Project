import math
from typing import Optional

import aiomysql
from fastapi import APIRouter, Depends, HTTPException, Query

from database import get_db
from models.media import MediaDetail, MediaSummary, PaginatedMedia

router = APIRouter()

# ── shared SQL helpers ─────────────────────────────────────────────────────

_TYPE_EXPR = """
    CASE
        WHEN mo.media_id IS NOT NULL THEN 'movie'
        WHEN tv.media_id IS NOT NULL THEN 'tv'
        WHEN an.media_id IS NOT NULL THEN 'anime'
        ELSE 'unknown'
    END
"""

_BASE_FROM = """
    FROM Media_Content mc
    LEFT JOIN Movie     mo ON mc.media_id = mo.media_id
    LEFT JOIN TV_Series tv ON mc.media_id = tv.media_id
    LEFT JOIN Anime     an ON mc.media_id = an.media_id
    LEFT JOIN Genre      g ON mc.media_id =  g.media_id
"""


async def _fetch_genres(cur, media_id: str) -> list[str]:
    await cur.execute("SELECT type FROM Genre WHERE media_id = %s ORDER BY type", (media_id,))
    rows = await cur.fetchall()
    return [r["type"] for r in rows]


async def _fetch_tags(cur, media_id: str) -> list[str]:
    await cur.execute("SELECT tag_name FROM Movie_Tag WHERE media_id = %s", (media_id,))
    rows = await cur.fetchall()
    return [r["tag_name"] for r in rows]


# ── GET /media ─────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedMedia)
async def list_media(
    type: Optional[str] = Query(None, description="movie | tv | anime"),
    genre: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    sort: str = Query("rating", description="rating | title | release_date"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: aiomysql.Connection = Depends(get_db),
):
    offset = (page - 1) * limit
    where: list[str] = ["1=1"]
    params: list = []

    if type == "movie":
        where.append("mo.media_id IS NOT NULL")
    elif type == "tv":
        where.append("tv.media_id IS NOT NULL")
    elif type == "anime":
        where.append("an.media_id IS NOT NULL")

    if genre:
        where.append("mc.media_id IN (SELECT media_id FROM Genre WHERE type = %s)")
        params.append(genre)

    if search:
        where.append("mc.title LIKE %s")
        params.append(f"%{search}%")

    where_sql = " AND ".join(where)

    order_map = {
        "rating":       "mc.average_rating DESC",
        "title":        "mc.title ASC",
        "release_date": "mc.release_date DESC",
    }
    order_sql = order_map.get(sort, "mc.average_rating DESC")

    count_sql = f"""
        SELECT COUNT(DISTINCT mc.media_id) AS total
        {_BASE_FROM}
        WHERE {where_sql}
    """

    data_sql = f"""
        SELECT
            mc.media_id, mc.title, mc.release_date, mc.average_rating, mc.poster_url,
            {_TYPE_EXPR} AS media_type,
            COALESCE(GROUP_CONCAT(DISTINCT g.type ORDER BY g.type SEPARATOR ','), '') AS genres
        {_BASE_FROM}
        WHERE {where_sql}
        GROUP BY mc.media_id, mc.title, mc.release_date, mc.average_rating, mc.poster_url
        ORDER BY {order_sql}
        LIMIT %s OFFSET %s
    """

    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(count_sql, params)
        total = (await cur.fetchone())["total"]

        await cur.execute(data_sql, params + [limit, offset])
        rows = await cur.fetchall()

    items = [
        MediaSummary(
            media_id=row["media_id"],
            title=row["title"],
            release_date=row["release_date"],
            average_rating=row["average_rating"],
            media_type=row["media_type"],
            genres=row["genres"].split(",") if row["genres"] else [],
            poster_url=row["poster_url"],
        )
        for row in rows
    ]

    return PaginatedMedia(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 0,
    )


# ── GET /media/movies ──────────────────────────────────────────────────────

@router.get("/movies", response_model=PaginatedMedia)
async def list_movies(
    genre: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: aiomysql.Connection = Depends(get_db),
):
    return await list_media(type="movie", genre=genre, search=search,
                            sort="rating", page=page, limit=limit, db=db)


# ── GET /media/tv ──────────────────────────────────────────────────────────

@router.get("/tv", response_model=PaginatedMedia)
async def list_tv(
    genre: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: aiomysql.Connection = Depends(get_db),
):
    return await list_media(type="tv", genre=genre, search=search,
                            sort="rating", page=page, limit=limit, db=db)


# ── GET /media/anime ───────────────────────────────────────────────────────

@router.get("/anime", response_model=PaginatedMedia)
async def list_anime(
    genre: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: aiomysql.Connection = Depends(get_db),
):
    return await list_media(type="anime", genre=genre, search=search,
                            sort="rating", page=page, limit=limit, db=db)


# ── GET /media/{media_id} ──────────────────────────────────────────────────

@router.get("/{media_id}", response_model=MediaDetail)
async def get_media(media_id: str, db: aiomysql.Connection = Depends(get_db)):
    sql = f"""
        SELECT
            mc.media_id, mc.title, mc.release_date, mc.synopsis, mc.average_rating, mc.poster_url,
            {_TYPE_EXPR} AS media_type,
            mo.runtime, mo.box_office,
            tv.total_seasons, tv.status AS tv_status,
            an.source_material, an.total_episodes
        {_BASE_FROM}
        WHERE mc.media_id = %s
        GROUP BY mc.media_id
    """

    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(sql, (media_id,))
        row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Media not found")

        genres = await _fetch_genres(cur, media_id)
        tags = await _fetch_tags(cur, media_id) if row["media_type"] == "movie" else []

    return MediaDetail(
        media_id=row["media_id"],
        title=row["title"],
        release_date=row["release_date"],
        synopsis=row["synopsis"],
        average_rating=row["average_rating"],
        media_type=row["media_type"],
        genres=genres,
        poster_url=row["poster_url"],
        runtime=row["runtime"],
        box_office=row["box_office"],
        tags=tags,
        total_seasons=row["total_seasons"],
        tv_status=row["tv_status"],
        source_material=row["source_material"],
        total_episodes=row["total_episodes"],
    )
