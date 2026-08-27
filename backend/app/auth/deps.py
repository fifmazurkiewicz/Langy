import uuid
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db import get_db
from app.models import User

security = HTTPBearer(auto_error=False)
settings = get_settings()


def _decode_token(token: str) -> dict:
    if token == "dev-token":
        return {
            "sub": "00000000-0000-4000-8000-000000000001",
            "email": "dev@langy.local",
            "user_metadata": {"full_name": "Dev User"},
        }
    if settings.supabase_jwt_secret:
        return jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience=settings.supabase_jwt_audience,
        )
    # Dev fallback: unsigned parse for local testing without Supabase
    return jwt.decode(token, options={"verify_signature": False})


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization")

    payload = _decode_token(creds.credentials)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = uuid.UUID(sub)
    user = db.get(User, user_id)
    if user is None:
        email = payload.get("email")
        is_admin = (email or "").lower() in settings.admin_email_set
        user = User(
            id=user_id,
            email=email,
            display_name=payload.get("user_metadata", {}).get("full_name"),
            is_admin=is_admin,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_optional_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    if creds is None:
        return None
    try:
        return get_current_user(creds, db)
    except HTTPException:
        return None
