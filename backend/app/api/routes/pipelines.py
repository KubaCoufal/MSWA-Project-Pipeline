from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import require_roles
from app.db import get_session
from app.enums import UserRole
from app.models import Pipeline
from app.schemas import PipelineCreate, PipelineRead, PipelineUpdate, RunRead
from app.services.pipelines import create_pipeline, serialize_pipeline, update_pipeline
from app.services.runs import create_run, runtime_seconds

router = APIRouter(prefix="/pipelines", tags=["pipelines"])


@router.get("", response_model=list[PipelineRead])
def list_pipelines(session: Annotated[Session, Depends(get_session)]) -> list[PipelineRead]:
    pipelines = session.scalars(select(Pipeline).options(selectinload(Pipeline.versions)).order_by(Pipeline.created_at.desc())).all()
    return [serialize_pipeline(session, pipeline) for pipeline in pipelines]


@router.post(
    "",
    response_model=PipelineRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)
def create_pipeline_route(payload: PipelineCreate, session: Annotated[Session, Depends(get_session)]) -> PipelineRead:
    pipeline = create_pipeline(session, payload)
    session.refresh(pipeline)
    return serialize_pipeline(session, pipeline)


@router.get("/{pipeline_id}", response_model=PipelineRead)
def get_pipeline(pipeline_id: int, session: Annotated[Session, Depends(get_session)]) -> PipelineRead:
    pipeline = session.scalar(
        select(Pipeline).options(selectinload(Pipeline.versions)).where(Pipeline.id == pipeline_id)
    )
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline was not found.")
    return serialize_pipeline(session, pipeline)


@router.patch(
    "/{pipeline_id}",
    response_model=PipelineRead,
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)
def update_pipeline_route(
    pipeline_id: int,
    payload: PipelineUpdate,
    session: Annotated[Session, Depends(get_session)],
) -> PipelineRead:
    pipeline = update_pipeline(session, pipeline_id, payload)
    return serialize_pipeline(session, pipeline)


@router.post(
    "/{pipeline_id}/run",
    response_model=RunRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR))],
)
def run_pipeline(pipeline_id: int, session: Annotated[Session, Depends(get_session)]) -> RunRead:
    run = create_run(session, pipeline_id)
    return RunRead.model_validate(
        {
            **run.__dict__,
            "runtime_seconds": runtime_seconds(run),
        }
    )
