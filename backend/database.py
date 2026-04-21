import aiomysql
from config import settings

pool: aiomysql.Pool | None = None


async def create_pool() -> None:
    global pool
    pool = await aiomysql.create_pool(
        host=settings.DB_HOST,
        port=settings.DB_PORT,
        user=settings.DB_USER,
        password=settings.DB_PASSWORD,
        db=settings.DB_NAME,
        charset="utf8mb4",
        autocommit=False,
        minsize=2,
        maxsize=20,
    )


async def close_pool() -> None:
    global pool
    if pool:
        pool.close()
        await pool.wait_closed()


async def get_db():
    """FastAPI dependency — yields an aiomysql connection from the pool."""
    async with pool.acquire() as conn:
        yield conn
