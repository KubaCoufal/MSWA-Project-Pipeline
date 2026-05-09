from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db import get_session
from app.enums import RunStatus, UserRole
from app.models import Run
from app.schemas import RunRead, RunStepRead, RunUpdate
from app.services.run_steps import list_run_steps
from app.services.runs import list_runs_query, runtime_seconds, update_run

router = APIRouter(prefix="/runs", tags=["runs"], dependencies=[Depends(get_current_user)])


def serialize_run(run: Run) -> RunRead:
    return RunRead.model_validate({**run.__dict__, "runtime_seconds": runtime_seconds(run)})


@router.get("", response_model=list[RunRead])
def list_runs(
    session: Annotated[Session, Depends(get_session)],
    pipeline_id: int | None = None,
    status_filter: Annotated[RunStatus | None, Query(alias="status")] = None,
    started_from: datetime | None = None,
    started_to: datetime | None = None,
) -> list[RunRead]:
    runs = session.scalars(
        list_runs_query(
            pipeline_id=pipeline_id,
            run_status=status_filter,
            started_from=started_from,
            started_to=started_to,
        )
    ).all()
    return [serialize_run(run) for run in runs]


@router.get("/{run_id}", response_model=RunRead)
def get_run(run_id: int, session: Annotated[Session, Depends(get_session)]) -> RunRead:
    run = session.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run was not found.")
    return serialize_run(run)


@router.get("/{run_id}/steps", response_model=list[RunStepRead])
def get_run_steps(run_id: int, session: Annotated[Session, Depends(get_session)]) -> list[RunStepRead]:
    run = session.get(Run, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run was not found.")
    return [RunStepRead.model_validate(step) for step in list_run_steps(session, run_id)]


@router.patch(
    "/{run_id}",
    response_model=RunRead,
    dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR))],
)
def patch_run(
    run_id: int,
    payload: RunUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> RunRead:
    run = update_run(session, run_id, payload)
    return serialize_run(run)
