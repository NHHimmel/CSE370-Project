from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import database
from routers import auth, comments, lists, media, ratings, recommendations, reviews, users, watchlists


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.create_pool()
    yield
    await database.close_pool()


app = FastAPI(
    title="MediaHive API",
    description="Community-Driven Media Discovery & Collaborative Discussion Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|\[::1\]):(5173|3000)$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
)

app.include_router(auth.router,            prefix="/auth",            tags=["Auth"])
app.include_router(users.router,           prefix="/users",           tags=["Users"])
app.include_router(media.router,           prefix="/media",           tags=["Media"])
app.include_router(reviews.router,         prefix="/reviews",         tags=["Reviews"])
app.include_router(comments.router,        prefix="/comments",        tags=["Comments"])
app.include_router(ratings.router,         prefix="/ratings",         tags=["Ratings"])
app.include_router(watchlists.router,      prefix="/watchlist",       tags=["Watchlist"])
app.include_router(lists.router,           prefix="/lists",           tags=["Custom Lists"])
app.include_router(recommendations.router, prefix="/recommendations", tags=["Recommendations"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "MediaHive API is running", "docs": "/docs"}
