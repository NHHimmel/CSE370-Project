import aiomysql
from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from dependencies import get_current_user
from models.rating import RatingCreate, RatingResponse

router = APIRouter()


# ── GET /ratings/media/{media_id}/mine ────────────────────────────────────

@router.get("/media/{media_id}/mine", response_model=RatingResponse)
async def get_my_rating(
    media_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT user_id, media_id, score, rated_at FROM Rating WHERE user_id = %s AND media_id = %s",
            (current_user["user_id"], media_id),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Rating not found")
    return RatingResponse(**row)


# ── POST /ratings/media/{media_id} — create or update (upsert) ───────────

@router.post("/media/{media_id}", response_model=RatingResponse, status_code=status.HTTP_200_OK)
async def rate_media(
    media_id: str,
    body: RatingCreate,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT media_id FROM Media_Content WHERE media_id = %s", (media_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Media not found")

        # Upsert — trigger will recalculate average_rating automatically
        await cur.execute(
            """
            INSERT INTO Rating (user_id, media_id, score)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE score = VALUES(score), rated_at = CURRENT_TIMESTAMP
            """,
            (current_user["user_id"], media_id, float(body.score)),
        )
        await db.commit()

        await cur.execute(
            "SELECT user_id, media_id, score, rated_at FROM Rating WHERE user_id = %s AND media_id = %s",
            (current_user["user_id"], media_id),
        )
        row = await cur.fetchone()
    return RatingResponse(**row)


# ── DELETE /ratings/media/{media_id} ─────────────────────────────────────

@router.delete("/media/{media_id}", status_code=204)
async def delete_rating(
    media_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor() as cur:
        await cur.execute(
            "DELETE FROM Rating WHERE user_id = %s AND media_id = %s",
            (current_user["user_id"], media_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Rating not found")
        await db.commit()
