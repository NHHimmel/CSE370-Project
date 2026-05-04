import uuid
from typing import List

import aiomysql
from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from dependencies import get_current_user
from models.review import ReviewCreate, ReviewResponse, ReviewUpdate

router = APIRouter()


# ── GET /reviews/by-media/{media_id} ──────────────────────────────────────

@router.get("/by-media/{media_id}", response_model=List[ReviewResponse])
async def get_reviews_for_media(
    media_id: str,
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """
            SELECT
                r.review_id, r.user_id, r.media_id, r.body, r.created_at,
                CONCAT(u.FName, ' ', u.LName) AS reviewer_name,
                (SELECT COUNT(*) FROM Comments c WHERE c.review_id = r.review_id) AS comment_count
            FROM Reviews r
            JOIN User u ON r.user_id = u.user_id
            WHERE r.media_id = %s
            ORDER BY r.created_at DESC
            """,
            (media_id,),
        )
        rows = await cur.fetchall()
    return [ReviewResponse(**row) for row in rows]


# ── POST /reviews/by-media/{media_id} ─────────────────────────────────────

@router.post(
    "/by-media/{media_id}",
    response_model=ReviewResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_review(
    media_id: str,
    body: ReviewCreate,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        # Verify media exists
        await cur.execute("SELECT media_id FROM Media_Content WHERE media_id = %s", (media_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Media not found")

        review_id = str(uuid.uuid4())
        await cur.execute(
            "INSERT INTO Reviews (review_id, user_id, media_id, body) VALUES (%s, %s, %s, %s)",
            (review_id, current_user["user_id"], media_id, body.body),
        )
        await db.commit()

        await cur.execute(
            """
            SELECT r.review_id, r.user_id, r.media_id, r.body, r.created_at,
                   CONCAT(u.FName, ' ', u.LName) AS reviewer_name,
                   0 AS comment_count
            FROM Reviews r
            JOIN User u ON r.user_id = u.user_id
            WHERE r.review_id = %s
            """,
            (review_id,),
        )
        row = await cur.fetchone()
    return ReviewResponse(**row)


# ── GET /reviews/{review_id} ──────────────────────────────────────────────

@router.get("/{review_id}", response_model=ReviewResponse)
async def get_review(review_id: str, db: aiomysql.Connection = Depends(get_db)):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """
            SELECT r.review_id, r.user_id, r.media_id, r.body, r.created_at,
                   CONCAT(u.FName, ' ', u.LName) AS reviewer_name,
                   (SELECT COUNT(*) FROM Comments c WHERE c.review_id = r.review_id) AS comment_count
            FROM Reviews r
            JOIN User u ON r.user_id = u.user_id
            WHERE r.review_id = %s
            """,
            (review_id,),
        )
        row = await cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Review not found")
    return ReviewResponse(**row)


# ── PUT /reviews/{review_id} ──────────────────────────────────────────────

@router.put("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: str,
    body: ReviewUpdate,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT user_id FROM Reviews WHERE review_id = %s", (review_id,))
        review = await cur.fetchone()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        if review["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        await cur.execute(
            "UPDATE Reviews SET body = %s WHERE review_id = %s",
            (body.body, review_id),
        )
        await db.commit()

        await cur.execute(
            """
            SELECT r.review_id, r.user_id, r.media_id, r.body, r.created_at,
                   CONCAT(u.FName, ' ', u.LName) AS reviewer_name,
                   (SELECT COUNT(*) FROM Comments c WHERE c.review_id = r.review_id) AS comment_count
            FROM Reviews r JOIN User u ON r.user_id = u.user_id
            WHERE r.review_id = %s
            """,
            (review_id,),
        )
        row = await cur.fetchone()
    return ReviewResponse(**row)


# ── DELETE /reviews/{review_id} ───────────────────────────────────────────

@router.delete("/{review_id}", status_code=204)
async def delete_review(
    review_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT user_id FROM Reviews WHERE review_id = %s", (review_id,))
        review = await cur.fetchone()
        if not review:
            raise HTTPException(status_code=404, detail="Review not found")
        if review["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        await cur.execute("DELETE FROM Reviews WHERE review_id = %s", (review_id,))
        await db.commit()
