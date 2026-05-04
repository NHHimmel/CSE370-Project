import aiomysql
from pymysql.err import OperationalError

from config import settings

pool: aiomysql.Pool | None = None


async def create_pool() -> None:
    global pool
    try:
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
    except OperationalError as exc:
        error_code = exc.args[0] if exc.args else None
        if error_code == 1045:
            raise RuntimeError(
                "MySQL rejected the configured credentials. Check DB_USER and "
                "DB_PASSWORD in backend/.env, then restart the backend."
            ) from exc
        raise


async def close_pool() -> None:
    global pool
    if pool:
        pool.close()
        await pool.wait_closed()


async def get_db():
    """FastAPI dependency — yields an aiomysql connection from the pool."""
    async with pool.acquire() as conn:
        yield conn
