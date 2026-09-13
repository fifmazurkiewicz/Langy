from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.deps import get_approved_user
from app.config import get_settings
from app.db import get_db
from app.domain.privacy.service import (
    acknowledge_notice,
    delete_account,
    export_user_data,
)
from app.models import User

router = APIRouter()


class NoticeAcknowledgementRequest(BaseModel):
    notice_key: Literal["ai_first_use", "microphone"]
    notice_version: str


class DeleteAccountRequest(BaseModel):
    confirmation: str


@router.post("/notices/acknowledge")
def acknowledge(
    body: NoticeAcknowledgementRequest,
    user: Annotated[User, Depends(get_approved_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    acknowledge_notice(db, user, body.notice_key, body.notice_version)
    return {"ok": True}


@router.get("/export")
def export_data(
    user: Annotated[User, Depends(get_approved_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return export_user_data(db, user)


@router.delete("/account")
def remove_account(
    body: DeleteAccountRequest,
    user: Annotated[User, Depends(get_approved_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if body.confirmation != "DELETE":
        raise HTTPException(
            status_code=400, detail="Type DELETE to confirm account deletion"
        )
    try:
        delete_account(db, user, get_settings())
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"ok": True}
