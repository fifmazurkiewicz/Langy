from datetime import datetime
from zoneinfo import ZoneInfo

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import UsageLedger

settings = get_settings()


class SpendCapExceeded(Exception):
    pass


def _month_bounds() -> tuple[datetime, datetime]:
    tz = ZoneInfo(settings.spend_cap_tz)
    now = datetime.now(tz)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    if now.month == 12:
        end = start.replace(year=start.year + 1, month=1)
    else:
        end = start.replace(month=start.month + 1)
    return start, end


def monthly_spend_usd(db: Session, user_id) -> float:
    start, end = _month_bounds()
    total = db.scalar(
        select(func.coalesce(func.sum(UsageLedger.cost_usd), 0)).where(
            UsageLedger.user_id == user_id,
            UsageLedger.created_at >= start,
            UsageLedger.created_at < end,
        )
    )
    return float(total or 0)


def check_spend_cap(db: Session, user, cost_usd: float = 0) -> None:
    spent = monthly_spend_usd(db, user.id)
    cap = float(user.spend_cap_usd)
    if spent >= cap or spent + cost_usd > cap:
        raise SpendCapExceeded(f"Monthly spend cap reached ({cap:.2f} USD)")


def record_usage(
    db: Session,
    user_id,
    action_type: str,
    cost_usd: float,
    provider: str | None = None,
    langfuse_trace_id: str | None = None,
) -> UsageLedger:
    entry = UsageLedger(
        user_id=user_id,
        action_type=action_type,
        cost_usd=cost_usd,
        provider=provider,
        langfuse_trace_id=langfuse_trace_id,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
