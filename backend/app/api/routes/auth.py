from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.db import get_db
from app.domain.spend_cap.service import monthly_spend_usd
from app.models import User

router = APIRouter()


@router.get("/me")
def me(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "display_name": user.display_name,
        "is_admin": user.is_admin,
        "spend_cap_usd": float(user.spend_cap_usd),
        "monthly_spend_usd": monthly_spend_usd(db, user.id),
        "active_language": user.active_language,
        "onboarding_completed_at": user.onboarding_completed_at.isoformat() if user.onboarding_completed_at else None,
    }
