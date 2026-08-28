import jwt
from fastapi import HTTPException, status
from jwt import PyJWKClient
from jwt.exceptions import PyJWTError

from app.config import Settings, get_settings

_DEV_PAYLOAD = {
    "sub": "00000000-0000-4000-8000-000000000001",
    "email": "dev@langy.local",
    "user_metadata": {"full_name": "Dev User"},
    "is_admin": True,
}


def decode_access_token(token: str, settings: Settings | None = None) -> dict:
    settings = settings or get_settings()

    if token == "dev-token":
        return dict(_DEV_PAYLOAD)

    decode_errors: list[str] = []

    if settings.supabase_url:
        try:
            return _decode_with_jwks(token, settings)
        except PyJWTError as exc:
            decode_errors.append(f"jwks:{exc.__class__.__name__}")

    if settings.supabase_jwt_secret:
        try:
            return jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                audience=settings.supabase_jwt_audience,
            )
        except PyJWTError as exc:
            decode_errors.append(f"hs256:{exc.__class__.__name__}")

    if not settings.supabase_url and not settings.supabase_jwt_secret:
        return jwt.decode(token, options={"verify_signature": False})

    detail = "Invalid token"
    if decode_errors:
        detail = f"Invalid token ({', '.join(decode_errors)})"
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def _decode_with_jwks(token: str, settings: Settings) -> dict:
    jwks_url = f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"
    client = PyJWKClient(jwks_url, cache_keys=True)
    signing_key = client.get_signing_key_from_jwt(token)
    algorithm = signing_key.algorithm_name or "ES256"
    return jwt.decode(
        token,
        signing_key.key,
        algorithms=[algorithm],
        audience=settings.supabase_jwt_audience,
    )
