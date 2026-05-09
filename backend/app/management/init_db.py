from __future__ import annotations

from app.core.config import settings
from app.db import SessionLocal
from app.services.demo_content import seed_demo_content
from app.services.demo_users import seed_demo_users
from app.services.scheduler import sync_due_scheduled_runs


def main() -> None:
    with SessionLocal() as session:
        seed_demo_users(session)
        if settings.seed_demo_content:
            seed_demo_content(session)
        if settings.fake_scheduler_enabled:
            sync_due_scheduled_runs(session)


if __name__ == "__main__":
    main()
