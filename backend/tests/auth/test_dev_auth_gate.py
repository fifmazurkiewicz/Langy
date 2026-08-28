import jwt
import pytest
from fastapi import HTTPException

from app.auth.tokens import decode_access_token
from app.config import Settings


def make_settings(**overrides) -> Settings:
    """Settings isolated from the developer's local .env file."""
    base = {"supabase_url": "", "supabase_jwt_secret": "", "dev_auth_enabled": False}
    return Settings(_env_file=None, **{**base, **overrides})


def test_dev_token_rejected_when_dev_auth_disabled():
    with pytest.raises(HTTPException) as exc:
        decode_access_token("dev-token", make_settings())
    assert exc.value.status_code == 401


def test_dev_token_accepted_when_dev_auth_explicitly_enabled():
    payload = decode_access_token("dev-token", make_settings(dev_auth_enabled=True))
    assert payload["sub"] == "00000000-0000-4000-8000-000000000001"


def test_dev_token_rejected_when_supabase_configured_even_if_flag_set():
    """Production has SUPABASE_URL set — a stale DEV_AUTH_ENABLED must not open the door."""
    settings = make_settings(dev_auth_enabled=True, supabase_url="https://example.supabase.co")
    with pytest.raises(HTTPException) as exc:
        decode_access_token("dev-token", settings)
    assert exc.value.status_code == 401


def test_unsigned_token_rejected_when_dev_auth_disabled():
    unsigned = jwt.encode({"sub": "00000000-0000-4000-8000-000000000002"}, key="", algorithm="none")
    with pytest.raises(HTTPException) as exc:
        decode_access_token(unsigned, make_settings())
    assert exc.value.status_code == 401


def test_unsigned_token_accepted_only_in_dev_auth_mode():
    unsigned = jwt.encode({"sub": "00000000-0000-4000-8000-000000000002"}, key="", algorithm="none")
    payload = decode_access_token(unsigned, make_settings(dev_auth_enabled=True))
    assert payload["sub"] == "00000000-0000-4000-8000-000000000002"
