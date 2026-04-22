from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Dataset, Pipeline, PipelineVersion, Run
from app.schemas import PipelineCreate, PipelineRead, PipelineUpdate


def _latest_run_for_pipeline(session: Session, pipeline_id: int) -> Run | None:
    return session.scalar(
        select(Run).where(Run.pipeline_id == pipeline_id).order_by(Run.created_at.desc()).limit(1)
    )


def serialize_pipeline(session: Session, pipeline: Pipeline) -> PipelineRead:
    active_version = next((version for version in pipeline.versions if version.active), None)
    latest_run = _latest_run_for_pipeline(session, pipeline.id)
    return PipelineRead(
        id=pipeline.id,
        dataset_id=pipeline.dataset_id,
        name=pipeline.name,
        description=pipeline.description,
        schedule=pipeline.schedule,
        active=pipeline.active,
        kaggle_dataset=pipeline.kaggle_dataset,
        current_version_number=active_version.version_number if active_version else 1,
        latest_run_status=latest_run.status if latest_run else None,
        latest_run_started_at=latest_run.started_at if latest_run else None,
        created_at=pipeline.created_at,
        updated_at=pipeline.updated_at,
    )


def create_pipeline(session: Session, payload: PipelineCreate) -> Pipeline:
    dataset = session.get(Dataset, payload.dataset_id)
    if dataset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset was not found.")

    pipeline = Pipeline(
        dataset_id=payload.dataset_id,
        name=payload.name,
        description=payload.description,
        schedule=payload.schedule,
        active=payload.active,
        kaggle_dataset=payload.kaggle_dataset,
    )
    session.add(pipeline)
    session.flush()

    session.add(
        PipelineVersion(
            pipeline_id=pipeline.id,
            version_number=1,
            active=True,
            config={"mode": "simulated", "runtimeSeconds": settings.simulation_runtime_seconds},
        )
    )
    session.commit()
    session.refresh(pipeline)
    return pipeline


def update_pipeline(session: Session, pipeline_id: int, payload: PipelineUpdate) -> Pipeline:
    pipeline = session.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline was not found.")

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(pipeline, field, value)

    session.commit()
    session.refresh(pipeline)
    return pipeline
