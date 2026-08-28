import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.auth.tokens import DEV_TOKEN, decode_access_token
from app.config import get_settings
from app.db import get_db
from app.models import User

security = HTTPBearer(auto_error=False)
settings = get_settings()


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    if creds is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing authorization")

    payload = decode_access_token(creds.credentials, settings)
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = uuid.UUID(sub)
    user = db.get(User, user_id)
    if user is None:
        email = payload.get("email")
        is_admin = (email or "").lower() in settings.admin_email_set or payload.get("is_admin") is True
        user = User(
            id=user_id,
            email=email,
            display_name=payload.get("user_metadata", {}).get("full_name"),
            is_admin=is_admin,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    elif settings.dev_auth_allowed and creds.credentials == DEV_TOKEN and not user.is_admin:
        user.is_admin = True
        db.commit()
        db.refresh(user)
    return user


def get_admin_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin only")
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
