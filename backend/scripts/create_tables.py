"""Create all tables locally (dev only). Run: python -m scripts.create_tables"""

from app.db import Base, engine
from app.models import *  # noqa: F401,F403


def main() -> None:
    Base.metadata.create_all(bind=engine)
    print("Tables created.")


if __name__ == "__main__":
    main()
