from __future__ import annotations

from time import sleep

from app.core.config import settings
from app.db import session_scope
from app.enums import RunStatus
from app.enums import RunStepStatus
from app.models import PipelineVersion, Run, RunStep
from app.services.kaggle_eda import run_kaggle_eda
from app.services.run_steps import complete_step, fail_step, skip_pending_steps, start_step
from app.services.runs import apply_status_transition


def process_run(run_id: int) -> None:
    with session_scope() as session:
        run = session.get(Run, run_id)
        if run is None or run.status != RunStatus.PENDING:
            return
        start_step(session, run_id, "start_run", message="Worker picked up the queued job.")
        apply_status_transition(session, run, RunStatus.RUNNING)
        complete_step(session, run_id, "start_run", message="Run status moved to running.")

    with session_scope() as session:
        run = session.get(Run, run_id)
        if run is None:
            return
        pipeline_version = session.query(PipelineVersion).filter_by(
            pipeline_id=run.pipeline_id,
            version_number=run.pipeline_version_number,
        ).one_or_none()
        config = pipeline_version.config if pipeline_version else {"sourceType": "simulated"}

    source_type = config.get("sourceType", config.get("mode", "simulated"))
    if source_type == "simulated":
        with session_scope() as session:
            start_step(session, run_id, "simulate_processing", message="Running simulated processing work.")
        sleep(max(settings.simulation_runtime_seconds, 0))
        with session_scope() as session:
            complete_step(
                session,
                run_id,
                "simulate_processing",
                message="Simulation completed.",
                metrics={"recordsProcessed": settings.default_records_processed},
            )
        eda_result = None
        records_processed = settings.default_records_processed
    else:
        try:
            eda_result, records_processed = run_kaggle_eda(
                source_type,
                config.get("kaggleDatasetRef"),
                config.get("kaggleCategory"),
                _step_callback(run_id),
            )
        except Exception as exc:
            with session_scope() as session:
                fail_step(session, run_id, _current_running_or_next_step(session, run_id), str(exc))
                skip_pending_steps(session, run_id)
                complete_step(session, run_id, "cleanup", message="Temporary files are cleaned up by the worker process.")
                run = session.get(Run, run_id)
                if run is not None and run.status == RunStatus.RUNNING:
                    apply_status_transition(session, run, RunStatus.FAILED, error_message=str(exc), records_processed=0)
            return

    with session_scope() as session:
        run = session.get(Run, run_id)
        if run is None or run.status != RunStatus.RUNNING:
            return
        complete_step(session, run_id, "store_result", message="Run result stored.", metrics={"recordsProcessed": records_processed})
        complete_step(session, run_id, "cleanup", message="Temporary files are cleaned up by the worker process.")
        apply_status_transition(session, run, RunStatus.SUCCESS, records_processed=records_processed, eda_result=eda_result)


def _step_callback(run_id: int):
    def update_step(name: str, status: str, metrics: dict | None = None) -> None:
        with session_scope() as session:
            if status == "running":
                start_step(session, run_id, name)
            elif status == "success":
                complete_step(session, run_id, name, metrics=metrics)

    return update_step


def _current_running_or_next_step(session, run_id: int) -> str:
    steps = session.query(RunStep).filter_by(run_id=run_id).order_by(RunStep.step_order).all()
    running_step = next((step for step in steps if step.status == RunStepStatus.RUNNING), None)
    if running_step is not None:
        return running_step.name
    pending_step = next((step for step in steps if step.status == RunStepStatus.PENDING), None)
    return pending_step.name if pending_step is not None else "cleanup"
