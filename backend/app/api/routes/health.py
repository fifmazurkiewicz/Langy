from sqlalchemy import text
from sqlalchemy.orm import Session

from fastapi import APIRouter, Depends

from app.db import get_db

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness — fast, no dependencies. Render health check hits this."""
    return {"status": "ok", "service": "langy-api"}


@router.get("/health/ready")
def ready(db: Session = Depends(get_db)) -> dict:
    """Readiness — verifies DB connectivity before serving user traffic."""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "checks": {"database": "ok"}}
    except Exception:
        from fastapi.responses import JSONResponse

        return JSONResponse(
            status_code=503,
            content={"status": "degraded", "checks": {"database": "error"}},
        )
