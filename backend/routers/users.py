import aiomysql
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from dependencies import get_current_user
from models.user import UserPublicResponse, UserResponse, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT user_id, FName, LName, email, created_at, status FROM User WHERE user_id = %s",
            (current_user["user_id"],),
        )
        user = await cur.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(**user)


@router.get("/{user_id}", response_model=UserPublicResponse)
async def get_user(user_id: str, db: aiomysql.Connection = Depends(get_db)):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT user_id, FName, LName, created_at, status FROM User WHERE user_id = %s",
            (user_id,),
        )
        user = await cur.fetchone()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublicResponse(**user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    body: UserUpdate,
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    set_clause = ", ".join(f"{col} = %s" for col in updates)
    values = list(updates.values()) + [current_user["user_id"]]

    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            f"UPDATE User SET {set_clause} WHERE user_id = %s", values
        )
        await db.commit()
        await cur.execute(
            "SELECT user_id, FName, LName, email, created_at, status FROM User WHERE user_id = %s",
            (current_user["user_id"],),
        )
        user = await cur.fetchone()
    return UserResponse(**user)


@router.delete("/me", status_code=204)
async def delete_me(
    current_user: dict = Depends(get_current_user),
    db: aiomysql.Connection = Depends(get_db),
):
    async with db.cursor() as cur:
        await cur.execute("DELETE FROM User WHERE user_id = %s", (current_user["user_id"],))
        await db.commit()
