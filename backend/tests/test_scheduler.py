from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select

from app.enums import RunStatus
from app.models import Dataset, Pipeline, PipelineVersion, Run
from app.services.scheduler import sync_due_scheduled_runs


def test_sync_due_scheduled_runs_creates_missing_due_run_once(reset_db, monkeypatch) -> None:
    from app.db import SessionLocal

    monkeypatch.setattr("app.services.runs.enqueue_run_processing", lambda run_id: None)

    with SessionLocal() as session:
        dataset = Dataset(name="scheduler-dataset", owner="ops-team", schema_version=1)
        session.add(dataset)
        session.flush()
        pipeline = Pipeline(
            dataset_id=dataset.id,
            name="scheduler-pipeline",
            schedule="0 2 * * *",
            active=True,
        )
        session.add(pipeline)
        session.flush()
        session.add(PipelineVersion(pipeline_id=pipeline.id, version_number=1, active=True, config={"mode": "simulated"}))
        session.commit()
        pipeline_id = pipeline.id

    now = datetime(2026, 4, 11, 9, 0, tzinfo=timezone.utc)

    with SessionLocal() as session:
        created_runs = sync_due_scheduled_runs(session, now)
        assert len(created_runs) == 1

        all_runs = session.scalars(select(Run).where(Run.pipeline_id == pipeline_id)).all()
        assert len(all_runs) == 1
        assert all_runs[0].status == RunStatus.PENDING

        created_again = sync_due_scheduled_runs(session, now)
        assert created_again == []


def test_sync_due_scheduled_runs_skips_pipeline_with_inflight_run(reset_db, monkeypatch) -> None:
    from app.db import SessionLocal

    monkeypatch.setattr("app.services.runs.enqueue_run_processing", lambda run_id: None)

    with SessionLocal() as session:
        dataset = Dataset(name="scheduler-busy-dataset", owner="ops-team", schema_version=1)
        session.add(dataset)
        session.flush()
        pipeline = Pipeline(
            dataset_id=dataset.id,
            name="scheduler-busy-pipeline",
            schedule="*/15 * * * *",
            active=True,
        )
        session.add(pipeline)
        session.flush()
        session.add(PipelineVersion(pipeline_id=pipeline.id, version_number=1, active=True, config={"mode": "simulated"}))
        session.add(
            Run(
                pipeline_id=pipeline.id,
                pipeline_version_number=1,
                status=RunStatus.RUNNING,
                started_at=datetime(2026, 4, 11, 8, 45, tzinfo=timezone.utc),
                records_processed=500,
                created_at=datetime(2026, 4, 11, 8, 45, tzinfo=timezone.utc),
            )
        )
        session.commit()
        pipeline_id = pipeline.id

    with SessionLocal() as session:
        created_runs = sync_due_scheduled_runs(session, datetime(2026, 4, 11, 9, 0, tzinfo=timezone.utc))

        assert created_runs == []
        assert len(session.scalars(select(Run).where(Run.pipeline_id == pipeline_id)).all()) == 1
