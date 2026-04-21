from datetime import datetime

from pydantic import BaseModel


class CommentCreate(BaseModel):
    body: str


class CommentResponse(BaseModel):
    comment_id: str
    user_id: str
    review_id: str
    body: str
    created_at: datetime
    commenter_name: str         # FName + LName joined in SQL
