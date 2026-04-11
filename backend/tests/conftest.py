from __future__ import annotations

import os
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

TEST_DIR = Path(tempfile.mkdtemp(prefix="pipeline-monitor-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{(TEST_DIR / 'test.db').as_posix()}"
os.environ["SIMULATION_RUNTIME_SECONDS"] = "0"

from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.services.demo_users import seed_demo_users  # noqa: E402


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
    return {"X-Demo-User-Id": "1"}


@pytest.fixture
def operator_headers() -> dict[str, str]:
    return {"X-Demo-User-Id": "2"}


@pytest.fixture
def viewer_headers() -> dict[str, str]:
    return {"X-Demo-User-Id": "3"}
