from __future__ import annotations

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.enums import RunStatus
from app.models import Pipeline, PipelineVersion, Run
from app.schemas import RunUpdate
from app.services.alerts import evaluate_run_alerts
from app.services.run_steps import complete_step, initialize_run_steps
from app.workers.queue import enqueue_run_processing


VALID_TRANSITIONS: dict[RunStatus, set[RunStatus]] = {
    RunStatus.PENDING: {RunStatus.RUNNING},
    RunStatus.RUNNING: {RunStatus.SUCCESS, RunStatus.FAILED},
    RunStatus.SUCCESS: set(),
    RunStatus.FAILED: set(),
}


def _normalize_timestamp(value):
    if value is None or value.tzinfo is None:
        return value
    return value.replace(tzinfo=None)


def list_runs_query(
    pipeline_id: int | None = None,
    run_status: RunStatus | None = None,
    started_from: datetime | None = None,
    started_to: datetime | None = None,
) -> Select[tuple[Run]]:
    query = select(Run).order_by(Run.created_at.desc())
    if pipeline_id is not None:
        query = query.where(Run.pipeline_id == pipeline_id)
    if run_status is not None:
        query = query.where(Run.status == run_status)
    if started_from is not None:
        query = query.where(Run.started_at >= started_from)
    if started_to is not None:
        query = query.where(Run.started_at <= started_to)
    return query


def _active_pipeline_version_number(pipeline: Pipeline) -> int:
    active_version = next((version for version in pipeline.versions if version.active), None)
    if active_version is None:
        return 1
    return active_version.version_number


def runtime_seconds(run: Run) -> int | None:
    if run.started_at is None or run.finished_at is None:
        return None
    return int((_normalize_timestamp(run.finished_at) - _normalize_timestamp(run.started_at)).total_seconds())


def create_run(session: Session, pipeline_id: int) -> Run:
    pipeline = session.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline was not found.")
    if not pipeline.active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Inactive pipelines cannot be started.")

    run = Run(
        pipeline_id=pipeline.id,
        pipeline_version_number=_active_pipeline_version_number(pipeline),
        status=RunStatus.PENDING,
        records_processed=0,
    )
    session.add(run)
    session.commit()
    session.refresh(run)

    active_version = session.scalar(
        select(PipelineVersion).where(
            PipelineVersion.pipeline_id == pipeline.id,
            PipelineVersion.version_number == run.pipeline_version_number,
        )
    )
    config = active_version.config if active_version else {}
    source_type = config.get("sourceType", config.get("mode", "simulated"))
    initialize_run_steps(session, run.id, source_type)

    job_id = enqueue_run_processing(run.id)
    run.rq_job_id = job_id
    complete_step(session, run.id, "queue_job", message="Run enqueued in Redis RQ.", metrics={"jobId": job_id})
    session.commit()
    session.refresh(run)
    return run


def apply_status_transition(
    session: Session,
    run: Run,
    next_status: RunStatus,
    *,
    error_message: str | None = None,
    records_processed: int | None = None,
    eda_result: dict | None = None,
) -> Run:
    if next_status not in VALID_TRANSITIONS[run.status]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status transition: {run.status.value} -> {next_status.value}",
        )

    now = datetime.now(timezone.utc)
    if next_status == RunStatus.RUNNING:
        run.started_at = run.started_at or now
    else:
        run.finished_at = now
        if run.started_at is None:
            run.started_at = now

    run.status = next_status
    if next_status == RunStatus.FAILED:
        run.error_message = error_message or "Run failed during simulation."
        run.records_processed = records_processed if records_processed is not None else 0
    elif next_status == RunStatus.SUCCESS:
        run.error_message = None
        run.records_processed = (
            records_processed if records_processed is not None else max(run.records_processed, settings.default_records_processed)
        )
        if eda_result is not None:
            run.eda_result = eda_result

    evaluate_run_alerts(session, run)
    session.commit()
    session.refresh(run)
    return run


def update_run(session: Session, run_id: int, payload: RunUpdate) -> Run:
    run = session.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Run was not found.")

    return apply_status_transition(
        session,
        run,
        payload.status,
        error_message=payload.error_message,
        records_processed=payload.records_processed,
    )
