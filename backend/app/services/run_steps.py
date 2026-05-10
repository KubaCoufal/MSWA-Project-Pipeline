from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import RunStepStatus
from app.models import RunStep


SIMULATED_STEPS = ["queue_job", "start_run", "simulate_processing", "store_result", "cleanup"]
KAGGLE_STEPS = [
    "queue_job",
    "start_run",
    "resolve_source",
    "download_dataset",
    "discover_csv_files",
    "profile_csv_files",
    "store_result",
    "cleanup",
]


def default_steps_for_source(source_type: str) -> list[str]:
    return list(SIMULATED_STEPS if source_type == "simulated" else KAGGLE_STEPS)


def resolve_step_names(config: dict | None) -> list[str]:
    config = config or {}
    source_type = config.get("sourceType", config.get("mode", "simulated"))
    configured_steps = config.get("steps")
    if isinstance(configured_steps, list):
        step_names = [str(step).strip() for step in configured_steps if str(step).strip()]
        if step_names:
            return step_names
    return default_steps_for_source(source_type)


def initialize_run_steps(session: Session, run_id: int, config: dict | None) -> None:
    step_names = resolve_step_names(config)
    for index, name in enumerate(step_names, start=1):
        session.add(RunStep(run_id=run_id, step_order=index, name=name, status=RunStepStatus.PENDING))
    session.commit()


def list_run_steps(session: Session, run_id: int) -> list[RunStep]:
    return session.scalars(select(RunStep).where(RunStep.run_id == run_id).order_by(RunStep.step_order)).all()


def start_step(session: Session, run_id: int, name: str, message: str | None = None) -> RunStep | None:
    step = _get_step(session, run_id, name)
    if step is None:
        return None
    step.status = RunStepStatus.RUNNING
    step.started_at = step.started_at or datetime.now(timezone.utc)
    step.message = message
    step.error_message = None
    session.commit()
    session.refresh(step)
    return step


def complete_step(
    session: Session,
    run_id: int,
    name: str,
    *,
    message: str | None = None,
    metrics: dict | None = None,
) -> RunStep | None:
    step = _get_step(session, run_id, name)
    if step is None:
        return None
    step.status = RunStepStatus.SUCCESS
    step.started_at = step.started_at or datetime.now(timezone.utc)
    step.finished_at = datetime.now(timezone.utc)
    step.message = message if message is not None else step.message
    step.metrics = metrics
    session.commit()
    session.refresh(step)
    return step


def fail_step(session: Session, run_id: int, name: str, error_message: str) -> RunStep | None:
    step = _get_step(session, run_id, name)
    if step is None:
        return None
    step.status = RunStepStatus.FAILED
    step.started_at = step.started_at or datetime.now(timezone.utc)
    step.finished_at = datetime.now(timezone.utc)
    step.error_message = error_message
    session.commit()
    session.refresh(step)
    return step


def skip_pending_steps(session: Session, run_id: int) -> None:
    pending_steps = session.scalars(
        select(RunStep).where(RunStep.run_id == run_id, RunStep.status == RunStepStatus.PENDING)
    ).all()
    for step in pending_steps:
        step.status = RunStepStatus.SKIPPED
        step.finished_at = datetime.now(timezone.utc)
    session.commit()


def _get_step(session: Session, run_id: int, name: str) -> RunStep | None:
    return session.scalar(select(RunStep).where(RunStep.run_id == run_id, RunStep.name == name).limit(1))
