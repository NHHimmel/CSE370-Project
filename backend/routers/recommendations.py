from typing import List

import aiomysql
from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from dependencies import get_current_user
from models.recommendation import RecommendCreate, RecommendationResponse

router = APIRouter()

_MEDIA_TYPE_EXPR = """
    CASE
        WHEN mo.media_id IS NOT NULL THEN 'movie'
        WHEN tv.media_id IS NOT NULL THEN 'tv'
        WHEN an.media_id IS NOT NULL THEN 'anime'
        ELSE 'unknown'
    END
"""


# ── GET /recommendations/received ─────────────────────────────────────────

@router.get("/received", response_model=List[RecommendationResponse])
async def get_received(
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            f"""
            SELECT
                r.user_id1 AS sender_id,
                CONCAT(us.FName, ' ', us.LName) AS sender_name,
                r.user_id2 AS receiver_id,
                CONCAT(ur.FName, ' ', ur.LName) AS receiver_name,
                r.media_id, mc.title AS media_title,
                {_MEDIA_TYPE_EXPR} AS media_type,
                mc.release_date, mc.average_rating
            FROM Recommends r
            JOIN User us ON r.user_id1 = us.user_id
            JOIN User ur ON r.user_id2 = ur.user_id
            JOIN Media_Content mc ON r.media_id = mc.media_id
            LEFT JOIN Movie     mo ON mc.media_id = mo.media_id
            LEFT JOIN TV_Series tv ON mc.media_id = tv.media_id
            LEFT JOIN Anime     an ON mc.media_id = an.media_id
            WHERE r.user_id2 = %s
            ORDER BY mc.average_rating DESC
            """,
            (current_user["user_id"],),
        )
        rows = await cur.fetchall()
    return [RecommendationResponse(**row) for row in rows]


# ── GET /recommendations/sent ──────────────────────────────────────────────

@router.get("/sent", response_model=List[RecommendationResponse])
async def get_sent(
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            f"""
            SELECT
                r.user_id1 AS sender_id,
                CONCAT(us.FName, ' ', us.LName) AS sender_name,
                r.user_id2 AS receiver_id,
                CONCAT(ur.FName, ' ', ur.LName) AS receiver_name,
                r.media_id, mc.title AS media_title,
                {_MEDIA_TYPE_EXPR} AS media_type,
                mc.release_date, mc.average_rating
            FROM Recommends r
            JOIN User us ON r.user_id1 = us.user_id
            JOIN User ur ON r.user_id2 = ur.user_id
            JOIN Media_Content mc ON r.media_id = mc.media_id
            LEFT JOIN Movie     mo ON mc.media_id = mo.media_id
            LEFT JOIN TV_Series tv ON mc.media_id = tv.media_id
            LEFT JOIN Anime     an ON mc.media_id = an.media_id
            WHERE r.user_id1 = %s
            """,
            (current_user["user_id"],),
        )
        rows = await cur.fetchall()
    return [RecommendationResponse(**row) for row in rows]


# ── POST /recommendations ──────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED)
async def send_recommendation(
    body: RecommendCreate,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    if body.receiver_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot recommend to yourself")

    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT user_id FROM User WHERE user_id = %s", (body.receiver_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Receiver not found")

        await cur.execute("SELECT media_id FROM Media_Content WHERE media_id = %s", (body.media_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Media not found")

        await cur.execute(
            "SELECT user_id1 FROM Recommends WHERE user_id1 = %s AND user_id2 = %s AND media_id = %s",
            (current_user["user_id"], body.receiver_id, body.media_id),
        )
        if await cur.fetchone():
            raise HTTPException(status_code=409, detail="Already recommended this media to that user")

        await cur.execute(
            "INSERT INTO Recommends (user_id1, user_id2, media_id) VALUES (%s, %s, %s)",
            (current_user["user_id"], body.receiver_id, body.media_id),
        )
        await db.commit()
    return {"detail": "Recommendation sent"}


# ── DELETE /recommendations/{receiver_id}/{media_id} ──────────────────────

@router.delete("/{receiver_id}/{media_id}", status_code=204)
async def delete_recommendation(
    receiver_id: str,
    media_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor() as cur:
        await cur.execute(
            "DELETE FROM Recommends WHERE user_id1 = %s AND user_id2 = %s AND media_id = %s",
            (current_user["user_id"], receiver_id, media_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Recommendation not found")
        await db.commit()
