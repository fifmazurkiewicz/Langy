import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.models import ConversationSummary, User, UserMemoryFact

router = APIRouter()


class FactUpdate(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


@router.get("/facts")
def list_facts(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    facts = (
        db.query(UserMemoryFact)
        .filter(UserMemoryFact.user_id == user.id)
        .order_by(UserMemoryFact.updated_at.desc())
        .limit(50)
        .all()
    )
    return {
        "facts": [
            {
                "id": str(f.id),
                "content": f.content,
                "source_conversation_id": str(f.source_conversation_id) if f.source_conversation_id else None,
                "updated_at": f.updated_at.isoformat() if f.updated_at else None,
            }
            for f in facts
        ]
    }


@router.patch("/facts/{fact_id}")
def update_fact(
    fact_id: uuid.UUID,
    body: FactUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    fact = db.get(UserMemoryFact, fact_id)
    if not fact or fact.user_id != user.id:
        raise HTTPException(status_code=404, detail="Fact not found")
    fact.content = body.content.strip()
    db.commit()
    return {"ok": True}


@router.delete("/facts/{fact_id}")
def delete_fact(
    fact_id: uuid.UUID,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    fact = db.get(UserMemoryFact, fact_id)
    if not fact or fact.user_id != user.id:
        raise HTTPException(status_code=404, detail="Fact not found")
    db.delete(fact)
    db.commit()
    return {"ok": True}


@router.get("/summaries")
def list_summaries(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    language: str | None = None,
) -> dict:
    q = db.query(ConversationSummary).filter(ConversationSummary.user_id == user.id)
    if language:
        q = q.filter(ConversationSummary.language == language)
    rows = q.order_by(ConversationSummary.created_at.desc()).limit(10).all()
    return {
        "summaries": [
            {
                "id": str(s.id),
                "conversation_id": str(s.conversation_id),
                "language": s.language,
                "summary": s.summary,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in rows
        ]
    }
