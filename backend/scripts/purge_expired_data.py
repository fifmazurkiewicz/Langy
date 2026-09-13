from app.config import get_settings
from app.db import SessionLocal
from app.domain.privacy.retention import purge_expired_conversations


def main() -> None:
    settings = get_settings()
    with SessionLocal() as db:
        count = purge_expired_conversations(db, settings.conversation_retention_days)
    print(f"Purged {count} expired conversations")


if __name__ == "__main__":
    main()
