from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.selection.schemas import (
    AddSelectionPendingRequest,
    AddSelectionPendingResponse,
    TranslateSelectionRequest,
    TranslateSelectionResponse,
)
from app.domain.selection.service import SpendCapExceeded, add_selection_pending, translate_selection
from app.models import User

router = APIRouter(prefix="/selection")


@router.post("/translate", response_model=TranslateSelectionResponse)
def translate(
    body: TranslateSelectionRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> TranslateSelectionResponse:
    try:
        return translate_selection(db, user, body)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc


@router.post("/pending", response_model=AddSelectionPendingResponse)
def add_pending(
    body: AddSelectionPendingRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AddSelectionPendingResponse:
    try:
        return add_selection_pending(db, user, body)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
