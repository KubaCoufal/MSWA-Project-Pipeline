from __future__ import annotations

from time import sleep

from app.core.config import settings
from app.db import session_scope
from app.enums import RunStatus
from app.models import Run
from app.services.runs import apply_status_transition


def process_run(run_id: int) -> None:
    with session_scope() as session:
        run = session.get(Run, run_id)
        if run is None or run.status != RunStatus.PENDING:
            return
        apply_status_transition(session, run, RunStatus.RUNNING)

    sleep(max(settings.simulation_runtime_seconds, 0))

    with session_scope() as session:
        run = session.get(Run, run_id)
        if run is None or run.status != RunStatus.RUNNING:
            return
        apply_status_transition(session, run, RunStatus.SUCCESS, records_processed=settings.default_records_processed)
