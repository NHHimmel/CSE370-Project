import uuid
from typing import List

import aiomysql
from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from dependencies import get_current_user
from models.comment import CommentCreate, CommentResponse

router = APIRouter()


# ── GET /comments/by-review/{review_id} ───────────────────────────────────

@router.get("/by-review/{review_id}", response_model=List[CommentResponse])
async def get_comments(review_id: str, db: aiomysql.Connection = Depends(get_db)):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """
            SELECT c.comment_id, c.user_id, c.review_id, c.body, c.created_at,
                   CONCAT(u.FName, ' ', u.LName) AS commenter_name
            FROM Comments c
            JOIN User u ON c.user_id = u.user_id
            WHERE c.review_id = %s
            ORDER BY c.created_at ASC
            """,
            (review_id,),
        )
        rows = await cur.fetchall()
    return [CommentResponse(**row) for row in rows]


# ── POST /comments/by-review/{review_id} ──────────────────────────────────

@router.post(
    "/by-review/{review_id}",
    response_model=CommentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_comment(
    review_id: str,
    body: CommentCreate,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT review_id FROM Reviews WHERE review_id = %s", (review_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Review not found")

        comment_id = str(uuid.uuid4())
        await cur.execute(
            "INSERT INTO Comments (comment_id, user_id, review_id, body) VALUES (%s, %s, %s, %s)",
            (comment_id, current_user["user_id"], review_id, body.body),
        )
        await db.commit()

        await cur.execute(
            """
            SELECT c.comment_id, c.user_id, c.review_id, c.body, c.created_at,
                   CONCAT(u.FName, ' ', u.LName) AS commenter_name
            FROM Comments c JOIN User u ON c.user_id = u.user_id
            WHERE c.comment_id = %s
            """,
            (comment_id,),
        )
        row = await cur.fetchone()
    return CommentResponse(**row)


# ── DELETE /comments/{comment_id} ─────────────────────────────────────────

@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT user_id FROM Comments WHERE comment_id = %s", (comment_id,))
        comment = await cur.fetchone()
        if not comment:
            raise HTTPException(status_code=404, detail="Comment not found")
        if comment["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        await cur.execute("DELETE FROM Comments WHERE comment_id = %s", (comment_id,))
        await db.commit()
