from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.correction.schemas import (
    AddCorrectionPendingRequest,
    AddCorrectionPendingResponse,
    CorrectionRequest,
    CorrectionResponse,
)
from app.domain.correction.service import SpendCapExceeded, add_correction_pending, run_correction
from app.models import User

router = APIRouter()


@router.post("/correction", response_model=CorrectionResponse)
def correction(
    body: CorrectionRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> CorrectionResponse:
    try:
        return run_correction(db, user, body)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc


@router.post("/correction/pending", response_model=AddCorrectionPendingResponse)
def correction_pending(
    body: AddCorrectionPendingRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> AddCorrectionPendingResponse:
    try:
        return add_correction_pending(db, user, body)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
