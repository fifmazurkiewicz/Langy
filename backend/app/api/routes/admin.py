from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth.deps import get_admin_user, get_current_user
from app.db import get_db
from app.domain.spend_cap.service import monthly_spend_usd
from app.models import User

router = APIRouter()


class SpendCapUpdate(BaseModel):
    spend_cap_usd: float = Field(gt=0, le=1000)


@router.get("/users")
def list_users(
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    users = db.query(User).order_by(User.created_at.desc()).all()
    return {
        "items": [
            {
                "id": str(u.id),
                "email": u.email,
                "display_name": u.display_name,
                "spend_cap_usd": float(u.spend_cap_usd),
                "monthly_spend_usd": monthly_spend_usd(db, u.id),
                "at_cap": monthly_spend_usd(db, u.id) >= float(u.spend_cap_usd),
            }
            for u in users
        ]
    }


@router.patch("/users/{user_id}/spend-cap")
def update_spend_cap(
    user_id: str,
    body: SpendCapUpdate,
    admin: Annotated[User, Depends(get_admin_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    import uuid

    user = db.get(User, uuid.UUID(user_id))
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    user.spend_cap_usd = body.spend_cap_usd
    db.commit()
    return {
        "id": str(user.id),
        "spend_cap_usd": float(user.spend_cap_usd),
        "monthly_spend_usd": monthly_spend_usd(db, user.id),
    }
