import uuid

import aiomysql
from fastapi import APIRouter, Depends, HTTPException, status

from auth import create_access_token, hash_password, verify_password
from database import get_db
from models.user import TokenResponse, UserLogin, UserRegister, UserResponse

router = APIRouter()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegister, db: aiomysql.Connection = Depends(get_db)):
    async with db.cursor(aiomysql.DictCursor) as cur:
        # Check duplicate email
        await cur.execute("SELECT user_id FROM User WHERE email = %s", (body.email,))
        if await cur.fetchone():
            raise HTTPException(status_code=409, detail="Email already registered")

        user_id = str(uuid.uuid4())
        await cur.execute(
            """
            INSERT INTO User (user_id, FName, LName, email, password_hash)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (user_id, body.FName, body.LName, body.email, hash_password(body.password)),
        )
        await db.commit()

        await cur.execute(
            "SELECT user_id, FName, LName, email, created_at, status FROM User WHERE user_id = %s",
            (user_id,),
        )
        user = await cur.fetchone()

    token = create_access_token(user_id, body.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(**user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, db: aiomysql.Connection = Depends(get_db)):
    async with db.cursor(aiomysql.DictCursor) as cur:
        await cur.execute(
            "SELECT user_id, FName, LName, email, password_hash, created_at, status FROM User WHERE email = %s",
            (body.email,),
        )
        user = await cur.fetchone()

    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if user["status"] != "active":
        raise HTTPException(status_code=403, detail="Account is not active")

    token = create_access_token(user["user_id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            user_id=user["user_id"],
            FName=user["FName"],
            LName=user["LName"],
            email=user["email"],
            created_at=user["created_at"],
            status=user["status"],
        ),
    )
