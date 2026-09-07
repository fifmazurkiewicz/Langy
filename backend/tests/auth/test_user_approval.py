import uuid
from unittest.mock import MagicMock, patch

import jwt
import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials
from fastapi.testclient import TestClient

from app.auth.deps import get_admin_user, get_current_user, require_approved
from app.config import get_settings
from app.db import get_db
from app.main import app
from app.models import User

client = TestClient(app)

ADMIN_EMAIL = next(iter(get_settings().admin_email_set))


class FakeSession:
    def __init__(self, existing: User | None = None) -> None:
        self.existing = existing
        self.added: User | None = None
        self.commits = 0

    def get(self, _model, _pk):  # noqa: ANN001
        return self.existing

    def add(self, obj: User) -> None:
        self.added = obj
        self.existing = obj

    def commit(self) -> None:
        self.commits += 1

    def refresh(self, _obj: User) -> None:
        return None


def _creds(token: str) -> HTTPAuthorizationCredentials:
    return HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)


def _unsigned_token(user_id: uuid.UUID, email: str) -> str:
    return jwt.encode(
        {"sub": str(user_id), "email": email, "user_metadata": {"full_name": "Test"}},
        key="",
        algorithm="none",
    )


def test_new_non_admin_insert_is_not_approved():
    db = FakeSession()
    token = _unsigned_token(uuid.uuid4(), "teacher@example.com")
    user = get_current_user(_creds(token), db)
    assert user.is_approved is False
    assert db.added is not None
    assert db.added.is_approved is False


def test_admin_allowlist_insert_is_approved():
    db = FakeSession()
    token = _unsigned_token(uuid.uuid4(), ADMIN_EMAIL)
    user = get_current_user(_creds(token), db)
    assert user.is_admin is True
    assert user.is_approved is True


def test_later_request_does_not_flip_is_approved_for_allowlist_email():
    existing = User(
        id=uuid.uuid4(),
        email=ADMIN_EMAIL,
        is_admin=True,
        is_approved=False,
    )
    db = FakeSession(existing=existing)
    token = _unsigned_token(existing.id, ADMIN_EMAIL)
    user = get_current_user(_creds(token), db)
    assert user.is_approved is False
    assert db.added is None


def test_require_approved_returns_403_account_pending_approval():
    pending = User(id=uuid.uuid4(), email="wait@example.com", is_approved=False)
    with pytest.raises(HTTPException) as exc:
        require_approved(pending)
    assert exc.value.status_code == 403
    assert exc.value.detail["code"] == "account_pending_approval"
    assert "akceptacj" in exc.value.detail["message"].lower()


def test_require_approved_passes_when_approved():
    approved = User(id=uuid.uuid4(), email="ok@example.com", is_approved=True)
    assert require_approved(approved) is approved


def test_feature_route_forbidden_when_unapproved():
    pending = User(id=uuid.uuid4(), email="wait@example.com", is_admin=False, is_approved=False)

    def _pending_user() -> User:
        return pending

    app.dependency_overrides[get_current_user] = _pending_user
    app.dependency_overrides[get_db] = lambda: MagicMock()
    try:
        response = client.get("/api/chat/conversations")
        assert response.status_code == 403
        body = response.json()
        detail = body.get("detail", body)
        assert detail["code"] == "account_pending_approval"
    finally:
        app.dependency_overrides.clear()


def test_me_allows_unapproved_user():
    pending = User(
        id=uuid.uuid4(),
        email="wait@example.com",
        is_admin=False,
        is_approved=False,
        spend_cap_usd=10,
    )

    db = MagicMock()
    db.scalar.return_value = 0

    app.dependency_overrides[get_current_user] = lambda: pending
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.get("/api/auth/me")
        assert response.status_code == 200
        body = response.json()
        assert body["is_approved"] is False
    finally:
        app.dependency_overrides.clear()


def test_admin_list_includes_is_approved():
    admin = User(id=uuid.uuid4(), email=ADMIN_EMAIL, is_admin=True, is_approved=True)
    pending = User(
        id=uuid.uuid4(),
        email="wait@example.com",
        is_admin=False,
        is_approved=False,
        spend_cap_usd=10,
    )

    db = MagicMock()
    db.query.return_value.order_by.return_value.all.return_value = [pending]
    db.scalar.return_value = 0

    app.dependency_overrides[get_admin_user] = lambda: admin
    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.api.routes.admin.monthly_spend_usd", return_value=0.0):
            response = client.get("/api/admin/users")
        assert response.status_code == 200
        item = response.json()["items"][0]
        assert item["is_approved"] is False
    finally:
        app.dependency_overrides.clear()


def test_admin_patch_accepts_user_without_changing_spend_cap():
    admin = User(id=uuid.uuid4(), email=ADMIN_EMAIL, is_admin=True, is_approved=True)
    target = User(
        id=uuid.uuid4(),
        email="wait@example.com",
        is_admin=False,
        is_approved=False,
        spend_cap_usd=25,
    )
    db = MagicMock()
    db.get.return_value = target

    app.dependency_overrides[get_admin_user] = lambda: admin
    app.dependency_overrides[get_db] = lambda: db
    try:
        with patch("app.api.routes.admin.monthly_spend_usd", return_value=0.0):
            response = client.patch(
                f"/api/admin/users/{target.id}",
                json={"is_approved": True},
            )
        assert response.status_code == 200
        assert target.is_approved is True
        assert float(target.spend_cap_usd) == 25
        body = response.json()
        assert body["is_approved"] is True
    finally:
        app.dependency_overrides.clear()


def test_admin_cannot_revoke_self():
    admin = User(id=uuid.uuid4(), email=ADMIN_EMAIL, is_admin=True, is_approved=True)
    db = MagicMock()
    db.get.return_value = admin

    app.dependency_overrides[get_admin_user] = lambda: admin
    app.dependency_overrides[get_db] = lambda: db
    try:
        response = client.patch(
            f"/api/admin/users/{admin.id}",
            json={"is_approved": False},
        )
        assert response.status_code == 403
        assert admin.is_approved is True
    finally:
        app.dependency_overrides.clear()
