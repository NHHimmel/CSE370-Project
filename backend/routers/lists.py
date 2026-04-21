import uuid
from typing import List

import aiomysql
from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db
from dependencies import get_current_user
from models.list import (
    CustomListCreate,
    CustomListResponse,
    CustomListUpdate,
    CustomListWithItems,
    ListItemAdd,
    ListItemResponse,
)

router = APIRouter()

_MEDIA_TYPE_EXPR = """
    CASE
        WHEN mo.media_id IS NOT NULL THEN 'movie'
        WHEN tv.media_id IS NOT NULL THEN 'tv'
        WHEN an.media_id IS NOT NULL THEN 'anime'
        ELSE 'unknown'
    END
"""


# ── GET /lists — current user's lists ─────────────────────────────────────

@router.get("", response_model=List[CustomListResponse])
async def get_my_lists(
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """
            SELECT cl.list_id, cl.user_id, cl.title, cl.description, cl.is_public, cl.created_at,
                   COUNT(li.media_id) AS item_count
            FROM Custom_List cl
            LEFT JOIN List_Item li ON cl.list_id = li.list_id
            WHERE cl.user_id = %s
            GROUP BY cl.list_id
            ORDER BY cl.created_at DESC
            """,
            (current_user["user_id"],),
        )
        rows = await cur.fetchall()
    return [CustomListResponse(**row) for row in rows]


# ── GET /lists/user/{user_id} — another user's public lists ───────────────

@router.get("/user/{user_id}", response_model=List[CustomListResponse])
async def get_user_lists(user_id: str, db: aiomysql.Connection = Depends(get_db)):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            """
            SELECT cl.list_id, cl.user_id, cl.title, cl.description, cl.is_public, cl.created_at,
                   COUNT(li.media_id) AS item_count
            FROM Custom_List cl
            LEFT JOIN List_Item li ON cl.list_id = li.list_id
            WHERE cl.user_id = %s AND cl.is_public = TRUE
            GROUP BY cl.list_id
            ORDER BY cl.created_at DESC
            """,
            (user_id,),
        )
        rows = await cur.fetchall()
    return [CustomListResponse(**row) for row in rows]


# ── POST /lists ────────────────────────────────────────────────────────────

@router.post("", response_model=CustomListResponse, status_code=status.HTTP_201_CREATED)
async def create_list(
    body: CustomListCreate,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    list_id = str(uuid.uuid4())
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "INSERT INTO Custom_List (list_id, user_id, title, description, is_public) VALUES (%s, %s, %s, %s, %s)",
            (list_id, current_user["user_id"], body.title, body.description, body.is_public),
        )
        await db.commit()

        await cur.execute(
            """
            SELECT list_id, user_id, title, description, is_public, created_at, 0 AS item_count
            FROM Custom_List WHERE list_id = %s
            """,
            (list_id,),
        )
        row = await cur.fetchone()
    return CustomListResponse(**row)


# ── GET /lists/{list_id} ──────────────────────────────────────────────────

@router.get("/{list_id}", response_model=CustomListWithItems)
async def get_list(
    list_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT list_id, user_id, title, description, is_public, created_at FROM Custom_List WHERE list_id = %s",
            (list_id,),
        )
        cl = await cur.fetchone()
        if not cl:
            raise HTTPException(status_code=404, detail="List not found")
        if not cl["is_public"] and cl["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="This list is private")

        await cur.execute(
            f"""
            SELECT mc.media_id, mc.title, mc.release_date, mc.average_rating,
                   {_MEDIA_TYPE_EXPR} AS media_type,
                   li.list_rank, li.added_at
            FROM List_Item li
            JOIN Media_Content mc ON li.media_id = mc.media_id
            LEFT JOIN Movie     mo ON mc.media_id = mo.media_id
            LEFT JOIN TV_Series tv ON mc.media_id = tv.media_id
            LEFT JOIN Anime     an ON mc.media_id = an.media_id
            WHERE li.list_id = %s
            ORDER BY COALESCE(li.list_rank, 99999), li.added_at
            """,
            (list_id,),
        )
        items = [ListItemResponse(**r) for r in await cur.fetchall()]

    return CustomListWithItems(**cl, items=items)


# ── PUT /lists/{list_id} ──────────────────────────────────────────────────

@router.put("/{list_id}", response_model=CustomListResponse)
async def update_list(
    list_id: str,
    body: CustomListUpdate,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT user_id FROM Custom_List WHERE list_id = %s", (list_id,))
        cl = await cur.fetchone()
        if not cl:
            raise HTTPException(status_code=404, detail="List not found")
        if cl["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        updates = {k: v for k, v in body.model_dump().items() if v is not None}
        if updates:
            set_clause = ", ".join(f"{col} = %s" for col in updates)
            await cur.execute(
                f"UPDATE Custom_List SET {set_clause} WHERE list_id = %s",
                list(updates.values()) + [list_id],
            )
            await db.commit()

        await cur.execute(
            """
            SELECT cl.list_id, cl.user_id, cl.title, cl.description, cl.is_public, cl.created_at,
                   COUNT(li.media_id) AS item_count
            FROM Custom_List cl LEFT JOIN List_Item li ON cl.list_id = li.list_id
            WHERE cl.list_id = %s GROUP BY cl.list_id
            """,
            (list_id,),
        )
        row = await cur.fetchone()
    return CustomListResponse(**row)


# ── DELETE /lists/{list_id} ───────────────────────────────────────────────

@router.delete("/{list_id}", status_code=204)
async def delete_list(
    list_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT user_id FROM Custom_List WHERE list_id = %s", (list_id,))
        cl = await cur.fetchone()
        if not cl:
            raise HTTPException(status_code=404, detail="List not found")
        if cl["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        await cur.execute("DELETE FROM Custom_List WHERE list_id = %s", (list_id,))
        await db.commit()


# ── POST /lists/{list_id}/items ───────────────────────────────────────────

@router.post("/{list_id}/items", status_code=status.HTTP_201_CREATED)
async def add_list_item(
    list_id: str,
    body: ListItemAdd,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT user_id FROM Custom_List WHERE list_id = %s", (list_id,))
        cl = await cur.fetchone()
        if not cl:
            raise HTTPException(status_code=404, detail="List not found")
        if cl["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        await cur.execute("SELECT media_id FROM Media_Content WHERE media_id = %s", (body.media_id,))
        if not await cur.fetchone():
            raise HTTPException(status_code=404, detail="Media not found")

        await cur.execute(
            "SELECT list_id FROM List_Item WHERE list_id = %s AND media_id = %s",
            (list_id, body.media_id),
        )
        if await cur.fetchone():
            raise HTTPException(status_code=409, detail="Media already in list")

        await cur.execute(
            "INSERT INTO List_Item (list_id, media_id, list_rank) VALUES (%s, %s, %s)",
            (list_id, body.media_id, body.list_rank),
        )
        await db.commit()
    return {"detail": "Item added"}


# ── DELETE /lists/{list_id}/items/{media_id} ─────────────────────────────

@router.delete("/{list_id}/items/{media_id}", status_code=204)
async def remove_list_item(
    list_id: str,
    media_id: str,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute("SELECT user_id FROM Custom_List WHERE list_id = %s", (list_id,))
        cl = await cur.fetchone()
        if not cl:
            raise HTTPException(status_code=404, detail="List not found")
        if cl["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Not authorized")

        await cur.execute(
            "DELETE FROM List_Item WHERE list_id = %s AND media_id = %s", (list_id, media_id)
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Item not in list")
        await db.commit()
