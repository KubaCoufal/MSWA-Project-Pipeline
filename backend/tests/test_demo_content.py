from __future__ import annotations

from sqlalchemy import select

from app.models import Alert, AlertRule, Dataset, Pipeline, Run
from app.services.demo_content import seed_demo_content


def test_seed_demo_content_populates_entities(reset_db) -> None:
    from app.db import SessionLocal

    with SessionLocal() as session:
        seed_demo_content(session)

        assert len(session.scalars(select(Dataset)).all()) == 4
        assert len(session.scalars(select(Pipeline)).all()) == 4
        assert len(session.scalars(select(Run)).all()) == 43
        assert len(session.scalars(select(AlertRule)).all()) == 5
        assert len(session.scalars(select(Alert)).all()) == 6


def test_seed_demo_content_is_idempotent(reset_db) -> None:
    from app.db import SessionLocal

    with SessionLocal() as session:
        seed_demo_content(session)
        seed_demo_content(session)

        assert len(session.scalars(select(Dataset)).all()) == 4
        assert len(session.scalars(select(Run)).all()) == 43
