from typing import List, Optional

import aiomysql
from fastapi import APIRouter, Depends, HTTPException, Query, status

from database import get_db
from dependencies import get_current_user
from models.watchlist import WatchlistAdd, WatchlistItem, WatchlistUpdate

router = APIRouter()

_MEDIA_TYPE_EXPR = """
    CASE
        WHEN mo.media_id IS NOT NULL THEN 'movie'
        WHEN tv.media_id IS NOT NULL THEN 'tv'
        WHEN an.media_id IS NOT NULL THEN 'anime'
        ELSE 'unknown'
    END
"""


# ── GET /watchlist ─────────────────────────────────────────────────────────

@router.get("", response_model=List[WatchlistItem])
async def get_watchlist(
    watch_status: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    where = "w.user_id = %s"
    params: list = [current_user["user_id"]]

    if watch_status:
        where += " AND w.status = %s"
        params.append(watch_status)

    sql = f"""
        SELECT mc.media_id, mc.title, mc.release_date, mc.average_rating,
               {_MEDIA_TYPE_EXPR} AS media_type,
               w.status, w.added_at
        FROM Watchlists w
        JOIN Media_Content mc ON w.media_id = mc.media_id
        LEFT JOIN Movie     mo ON mc.media_id = mo.media_id
        LEFT JOIN TV_Series tv ON mc.media_id = tv.media_id
        LEFT JOIN Anime     an ON mc.media_id = an.media_id
        WHERE {where}
        ORDER BY w.added_at DESC
    """

    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(sql, params)
        rows = await cur.fetchall()
    return [WatchlistItem(**row) for row in rows]


# ── POST /watchlist ────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    body: WatchlistAdd,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT media_id FROM Media_Content WHERE media_id = %s", (body.media_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Media not found")

        await cur.execute(
            "SELECT user_id FROM Watchlists WHERE user_id = %s AND media_id = %s",
            (current_user["user_id"], body.media_id),
        )
        if await cur.fetchone():
            raise HTTPException(status_code=409, detail="Already in watchlist")

        await cur.execute(
            "INSERT INTO Watchlists (user_id, media_id, status) VALUES (%s, %s, %s)",
            (current_user["user_id"], body.media_id, body.status),
        )
        await db.commit()
    return {"detail": "Added to watchlist"}


# ── PUT /watchlist/{media_id} ─────────────────────────────────────────────

@router.put("/{media_id}")
async def update_watchlist_status(
    media_id: str,
    body: WatchlistUpdate,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor() as cur:
        await cur.execute(
            "UPDATE Watchlists SET status = %s WHERE user_id = %s AND media_id = %s",
            (body.status, current_user["user_id"], media_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Watchlist entry not found")
        await db.commit()
    return {"detail": "Status updated"}


# ── DELETE /watchlist/{media_id} ──────────────────────────────────────────

@router.delete("/{media_id}", status_code=204)
async def remove_from_watchlist(
    media_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor() as cur:
        await cur.execute(
            "DELETE FROM Watchlists WHERE user_id = %s AND media_id = %s",
            (current_user["user_id"], media_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Watchlist entry not found")
        await db.commit()
