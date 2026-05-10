from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text

TEST_DIR = Path(tempfile.mkdtemp(prefix="pipeline-monitor-tests-"))
DEFAULT_TEST_DATABASE_URL = "postgresql+psycopg://pipeline:pipeline@localhost:5432/pipeline_monitor_test"
os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", DEFAULT_TEST_DATABASE_URL)
os.environ["SIMULATION_RUNTIME_SECONDS"] = "0"
os.environ["SEED_DEMO_CONTENT"] = "false"
os.environ["FAKE_SCHEDULER_ENABLED"] = "false"

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.core.security import create_demo_token  # noqa: E402
from app.services.demo_users import seed_demo_users  # noqa: E402


def _ensure_postgres_test_database() -> None:
    database_url = os.environ["DATABASE_URL"]
    if not database_url.startswith("postgresql"):
        return

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return
    except Exception:
        pass

    admin_url = database_url.rsplit("/", 1)[0] + "/postgres"
    db_name = database_url.rsplit("/", 1)[1].split("?", 1)[0]
    admin_engine = create_engine(admin_url, isolation_level="AUTOCOMMIT", future=True)
    with admin_engine.connect() as connection:
        connection.execute(text(f'CREATE DATABASE "{db_name}"'))
    admin_engine.dispose()


_ensure_postgres_test_database()


@pytest.fixture(autouse=True)
def reset_db() -> None:
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as session:
        seed_demo_users(session)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def admin_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {create_demo_token(1)}"}


@pytest.fixture
def operator_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {create_demo_token(2)}"}


@pytest.fixture
def viewer_headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {create_demo_token(3)}"}
