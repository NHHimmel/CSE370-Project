"""
seed_tmdb.py
============
Cold-start seeder for the MediaHive database.

Sources:
  - TMDB API  (movies + TV series)  → https://developer.themoviedb.org/docs
  - Jikan API (MyAnimeList anime)   → https://jikan.moe  (no API key needed)

Usage:
  1. pip install requests mysql-connector-python python-dotenv
  2. Copy .env.example to .env and fill in your credentials.
  3. python seed_tmdb.py

Environment variables (.env):
  TMDB_API_KEY=your_tmdb_v3_api_key
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=mediahive
  DB_USER=root
  DB_PASSWORD=your_password
"""

import os
import uuid
import time
import logging
from datetime import datetime

import requests
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

# ── logging ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger(__name__)

# ── configuration ──────────────────────────────────────────────────────────
TMDB_API_KEY  = os.getenv("TMDB_API_KEY", "")
TMDB_BASE_URL = "https://api.themoviedb.org/3"

DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", "3306")),
    "database": os.getenv("DB_NAME",     "mediahive"),
    "user":     os.getenv("DB_USER",     "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "charset":  "utf8mb4",
}

# How many pages to fetch per category (20 items / page)
MOVIE_PAGES   = 10   # → up to 200 movies
TV_PAGES      = 10   # → up to 200 TV series
ANIME_PAGES   = 10   # → up to 250 anime  (Jikan returns 25/page)

TMDB_GENRE_MAP: dict[int, str] = {}   # populated at runtime


# ── helpers ────────────────────────────────────────────────────────────────

def tmdb_get(endpoint: str, params: dict | None = None) -> dict:
    """GET request to TMDB with automatic retry on rate-limit."""
    url = f"{TMDB_BASE_URL}{endpoint}"
    base_params = {"api_key": TMDB_API_KEY, "language": "en-US"}
    if params:
        base_params.update(params)

    for attempt in range(3):
        resp = requests.get(url, params=base_params, timeout=10)
        if resp.status_code == 429:
            wait = int(resp.headers.get("Retry-After", 5))
            log.warning("TMDB rate-limit hit — waiting %ds", wait)
            time.sleep(wait)
            continue
        resp.raise_for_status()
        return resp.json()

    raise RuntimeError(f"TMDB request failed after retries: {endpoint}")


def jikan_get(endpoint: str, params: dict | None = None) -> dict:
    """GET request to Jikan (MAL) with polite rate-limiting."""
    url = f"https://api.jikan.moe/v4{endpoint}"
    for attempt in range(3):
        resp = requests.get(url, params=params, timeout=10)
        if resp.status_code == 429:
            log.warning("Jikan rate-limit — waiting 2s")
            time.sleep(2)
            continue
        resp.raise_for_status()
        time.sleep(0.4)   # Jikan recommends ≥ 3 req/s ceiling
        return resp.json()

    raise RuntimeError(f"Jikan request failed after retries: {endpoint}")


def parse_date(date_str: str | None) -> str | None:
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str[:10], "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        return None


# ── database layer ─────────────────────────────────────────────────────────

class DB:
    def __init__(self):
        self.conn = mysql.connector.connect(**DB_CONFIG)
        self.conn.autocommit = False
        self.cur = self.conn.cursor()

    def commit(self):
        self.conn.commit()

    def close(self):
        self.cur.close()
        self.conn.close()

    # ── media_content ──────────────────────────────────────────────────────
    def upsert_media_content(
        self,
        media_id: str,
        title: str,
        release_date: str | None,
        synopsis: str | None,
        poster_url: str | None = None,
    ) -> None:
        self.cur.execute(
            """
            INSERT INTO Media_Content (media_id, title, release_date, synopsis, poster_url)
            VALUES (%s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
                title        = VALUES(title),
                release_date = VALUES(release_date),
                synopsis     = VALUES(synopsis),
                poster_url   = VALUES(poster_url)
            """,
            (media_id, title, release_date, synopsis, poster_url),
        )

    # ── movie ──────────────────────────────────────────────────────────────
    def upsert_movie(
        self,
        media_id: str,
        runtime: int | None,
        box_office: float | None,
    ) -> None:
        self.cur.execute(
            """
            INSERT INTO Movie (media_id, runtime, box_office)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                runtime    = VALUES(runtime),
                box_office = VALUES(box_office)
            """,
            (media_id, runtime, box_office),
        )

    # ── tv_series ──────────────────────────────────────────────────────────
    def upsert_tv_series(
        self,
        media_id: str,
        total_seasons: int | None,
        status: str | None,
    ) -> None:
        self.cur.execute(
            """
            INSERT INTO TV_Series (media_id, total_seasons, status)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                total_seasons = VALUES(total_seasons),
                status        = VALUES(status)
            """,
            (media_id, total_seasons, status),
        )

    # ── anime ──────────────────────────────────────────────────────────────
    def upsert_anime(
        self,
        media_id: str,
        source_material: str | None,
        total_episodes: int | None,
    ) -> None:
        self.cur.execute(
            """
            INSERT INTO Anime (media_id, source_material, total_episodes)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                source_material = VALUES(source_material),
                total_episodes  = VALUES(total_episodes)
            """,
            (media_id, source_material, total_episodes),
        )

    # ── genres ─────────────────────────────────────────────────────────────
    def insert_genres(self, media_id: str, genres: list[str]) -> None:
        for genre in genres:
            self.cur.execute(
                """
                INSERT IGNORE INTO Genre (media_id, type)
                VALUES (%s, %s)
                """,
                (media_id, genre),
            )


# ── fetch genre map ────────────────────────────────────────────────────────

def load_tmdb_genres() -> None:
    log.info("Loading TMDB genre list …")
    for media_type in ("movie", "tv"):
        data = tmdb_get(f"/genre/{media_type}/list")
        for g in data.get("genres", []):
            TMDB_GENRE_MAP[g["id"]] = g["name"]
    log.info("Loaded %d genres", len(TMDB_GENRE_MAP))


# ── movies ─────────────────────────────────────────────────────────────────

def seed_movies(db: DB) -> None:
    log.info("=== Seeding MOVIES ===")
    total = 0

    for page in range(1, MOVIE_PAGES + 1):
        data = tmdb_get("/movie/popular", {"page": page})
        results = data.get("results", [])
        log.info("  Page %d/%d — %d items", page, MOVIE_PAGES, len(results))

        for item in results:
            tmdb_id   = item["id"]
            media_id  = str(uuid.uuid5(uuid.NAMESPACE_URL, f"tmdb:movie:{tmdb_id}"))

            # Fetch full details for runtime + revenue
            try:
                detail = tmdb_get(f"/movie/{tmdb_id}")
            except Exception as exc:
                log.warning("    Skipping movie %s: %s", tmdb_id, exc)
                continue

            title       = detail.get("title") or item.get("title", "Unknown")
            release_date = parse_date(detail.get("release_date"))
            synopsis    = detail.get("overview") or None
            runtime     = detail.get("runtime") or None
            box_office  = detail.get("revenue") or None
            poster_path = detail.get("poster_path") or item.get("poster_path")
            poster_url  = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
            genre_names = [
                TMDB_GENRE_MAP.get(g["id"], g["name"])
                for g in detail.get("genres", [])
            ]

            db.upsert_media_content(media_id, title, release_date, synopsis, poster_url)
            db.upsert_movie(media_id, runtime, box_office if box_office else None)
            db.insert_genres(media_id, genre_names)
            total += 1

        db.commit()
        time.sleep(0.25)

    log.info("Movies seeded: %d", total)


# ── TV series ───────────────────────────────────────────────────────────────

def seed_tv_series(db: DB) -> None:
    log.info("=== Seeding TV SERIES ===")
    total = 0

    for page in range(1, TV_PAGES + 1):
        data = tmdb_get("/tv/popular", {"page": page})
        results = data.get("results", [])
        log.info("  Page %d/%d — %d items", page, TV_PAGES, len(results))

        for item in results:
            tmdb_id  = item["id"]
            media_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"tmdb:tv:{tmdb_id}"))

            try:
                detail = tmdb_get(f"/tv/{tmdb_id}")
            except Exception as exc:
                log.warning("    Skipping TV %s: %s", tmdb_id, exc)
                continue

            title         = detail.get("name") or item.get("name", "Unknown")
            release_date  = parse_date(detail.get("first_air_date"))
            synopsis      = detail.get("overview") or None
            total_seasons = detail.get("number_of_seasons") or None
            status        = detail.get("status") or None
            poster_path   = detail.get("poster_path") or item.get("poster_path")
            poster_url    = f"https://image.tmdb.org/t/p/w500{poster_path}" if poster_path else None
            genre_names   = [
                TMDB_GENRE_MAP.get(g["id"], g["name"])
                for g in detail.get("genres", [])
            ]

            db.upsert_media_content(media_id, title, release_date, synopsis, poster_url)
            db.upsert_tv_series(media_id, total_seasons, status)
            db.insert_genres(media_id, genre_names)
            total += 1

        db.commit()
        time.sleep(0.25)

    log.info("TV series seeded: %d", total)


# ── anime (Jikan / MAL) ────────────────────────────────────────────────────

SOURCE_MAP = {
    "manga":        "Manga",
    "light_novel":  "Light Novel",
    "visual_novel": "Visual Novel",
    "game":         "Game",
    "original":     "Original",
    "novel":        "Novel",
    "other":        "Other",
}


def seed_anime(db: DB) -> None:
    log.info("=== Seeding ANIME (Jikan) ===")
    total = 0

    for page in range(1, ANIME_PAGES + 1):
        data = jikan_get("/top/anime", {"page": page, "limit": 25})
        results = data.get("data", [])
        log.info("  Page %d/%d — %d items", page, ANIME_PAGES, len(results))

        for item in results:
            mal_id   = item["mal_id"]
            media_id = str(uuid.uuid5(uuid.NAMESPACE_URL, f"mal:anime:{mal_id}"))

            title          = item.get("title_english") or item.get("title", "Unknown")
            release_date   = parse_date(item.get("aired", {}).get("from"))
            synopsis       = item.get("synopsis") or None
            total_episodes = item.get("episodes") or None
            source_raw     = (item.get("source") or "").lower()
            source_material = SOURCE_MAP.get(source_raw, source_raw.capitalize() or None)
            poster_url     = (item.get("images", {}).get("jpg", {}).get("large_image_url")
                              or item.get("images", {}).get("jpg", {}).get("image_url"))
            genres         = [g["name"] for g in item.get("genres", [])]
            genres        += [g["name"] for g in item.get("themes", [])]

            db.upsert_media_content(media_id, title, release_date, synopsis, poster_url)
            db.upsert_anime(media_id, source_material, total_episodes)
            db.insert_genres(media_id, genres)
            total += 1

        db.commit()

    log.info("Anime seeded: %d", total)


# ── entry point ────────────────────────────────────────────────────────────

def main() -> None:
    if not TMDB_API_KEY:
        raise EnvironmentError(
            "TMDB_API_KEY is not set. "
            "Get a free key at https://www.themoviedb.org/settings/api"
        )

    log.info("Connecting to MySQL …")
    db = DB()

    try:
        load_tmdb_genres()
        seed_movies(db)
        seed_tv_series(db)
        seed_anime(db)
        log.info("Cold-start seeding complete.")
    except Exception:
        log.exception("Seeding failed — rolling back")
        db.conn.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
