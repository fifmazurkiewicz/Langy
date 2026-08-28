from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.db import get_db
from app.main import app

client = TestClient(app)


def test_health_liveness():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "langy-api"


def test_health_ready_ok():
    mock_db = MagicMock()
    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        response = client.get("/api/health/ready")
        assert response.status_code == 200
        body = response.json()
        assert body["status"] == "ok"
        assert body["checks"]["database"] == "ok"
    finally:
        app.dependency_overrides.clear()


def test_health_ready_degraded():
    mock_db = MagicMock()
    mock_db.execute.side_effect = RuntimeError("db down")
    app.dependency_overrides[get_db] = lambda: mock_db
    try:
        response = client.get("/api/health/ready")
        assert response.status_code == 503
        body = response.json()
        assert body["status"] == "degraded"
        assert body["checks"]["database"] == "error"
    finally:
        app.dependency_overrides.clear()
