from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.security import get_current_user, require_roles
from app.db import get_session
from app.enums import UserRole
from app.models import Pipeline
from app.schemas import PipelineCreate, PipelineRead, PipelineUpdate, PipelineVersionRead, RunRead
from app.services.pipelines import (
    activate_pipeline_version,
    create_pipeline,
    list_pipeline_versions,
    serialize_pipeline,
    update_pipeline,
)
from app.services.runs import create_run, runtime_seconds

router = APIRouter(prefix="/pipelines", tags=["pipelines"], dependencies=[Depends(get_current_user)])


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


@router.get("/{pipeline_id}/versions", response_model=list[PipelineVersionRead])
def get_pipeline_versions(
    pipeline_id: int,
    session: Annotated[Session, Depends(get_session)],
) -> list[PipelineVersionRead]:
    return [PipelineVersionRead.model_validate(version) for version in list_pipeline_versions(session, pipeline_id)]


@router.post(
    "/{pipeline_id}/versions/{version_number}/activate",
    response_model=PipelineVersionRead,
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)
def activate_pipeline_version_route(
    pipeline_id: int,
    version_number: int,
    session: Annotated[Session, Depends(get_session)],
) -> PipelineVersionRead:
    version = activate_pipeline_version(session, pipeline_id, version_number)
    return PipelineVersionRead.model_validate(version)


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


@router.post(
    "/{pipeline_id}/versions/{version_number}/run",
    response_model=RunRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(UserRole.ADMIN, UserRole.OPERATOR))],
)
def run_pipeline_version(
    pipeline_id: int,
    version_number: int,
    session: Annotated[Session, Depends(get_session)],
) -> RunRead:
    run = create_run(session, pipeline_id, pipeline_version_number=version_number)
    return RunRead.model_validate(
        {
            **run.__dict__,
            "runtime_seconds": runtime_seconds(run),
        }
    )
