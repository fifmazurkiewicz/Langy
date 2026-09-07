from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_admin_user
from app.db import get_db
from app.domain.spend_cap.service import monthly_spend_usd
from app.models import User

router = APIRouter()


class SpendCapUpdate(BaseModel):
    spend_cap_usd: float = Field(gt=0, le=1000)


class ApprovalUpdate(BaseModel):
    is_approved: bool


def _user_item(db: Session, user: User) -> dict:
    spent = monthly_spend_usd(db, user.id)
    cap = float(user.spend_cap_usd)
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "spend_cap_usd": cap,
        "monthly_spend_usd": spent,
        "at_cap": spent >= cap,
        "is_approved": user.is_approved,
    }


@router.get("/users")
def list_users(
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    users = db.query(User).order_by(User.created_at.desc()).all()
    return {"items": [_user_item(db, u) for u in users]}


@router.patch("/users/{user_id}/spend-cap")
def update_spend_cap(
    user_id: str,
    body: SpendCapUpdate,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    user = db.get(User, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.spend_cap_usd = body.spend_cap_usd
    db.commit()
    return {
        "id": str(user.id),
        "spend_cap_usd": float(user.spend_cap_usd),
        "monthly_spend_usd": monthly_spend_usd(db, user.id),
    }


@router.patch("/users/{user_id}")
def update_user_approval(
    user_id: str,
    body: ApprovalUpdate,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    if str(admin.id) == user_id and body.is_approved is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin cannot revoke their own access",
        )
    user = db.get(User, UUID(user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_approved = body.is_approved
    db.commit()
    return _user_item(db, user)
