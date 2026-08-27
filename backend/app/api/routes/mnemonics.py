from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.mnemonics.schemas import GenerateMnemonicRequest, MnemonicResponse
from app.domain.mnemonics.service import (
    SpendCapExceeded,
    generate_mnemonic,
    get_cached_mnemonic,
    list_needs_mnemonic,
)
from app.models import User

router = APIRouter()


@router.get("/needs")
def needs_mnemonic(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    lang = language or user.active_language
    if not lang:
        raise HTTPException(status_code=400, detail="No active language")
    return {"items": list_needs_mnemonic(db, user, lang)}


@router.post("/generate", response_model=MnemonicResponse)
def mnemonic_generate(
    body: GenerateMnemonicRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MnemonicResponse:
    try:
        return generate_mnemonic(db, user, body)
    except SpendCapExceeded as exc:
        raise HTTPException(status_code=402, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{language}/{term}", response_model=MnemonicResponse)
def mnemonic_get(
    language: str,
    term: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> MnemonicResponse:
    result = get_cached_mnemonic(db, user, language, term)
    if not result:
        raise HTTPException(status_code=404, detail="Mnemonic not found")
    return result
