from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import Dataset, Pipeline, PipelineVersion, Run
from app.schemas import PipelineCreate, PipelineRead, PipelineUpdate
from app.services.run_steps import default_steps_for_source
from app.services.kaggle_eda import normalize_dataset_ref


def _latest_run_for_pipeline(session: Session, pipeline_id: int) -> Run | None:
    return session.scalar(
        select(Run).where(Run.pipeline_id == pipeline_id).order_by(Run.created_at.desc()).limit(1)
    )


def serialize_pipeline(session: Session, pipeline: Pipeline) -> PipelineRead:
    active_version = next((version for version in pipeline.versions if version.active), None)
    config = active_version.config if active_version else {}
    latest_run = _latest_run_for_pipeline(session, pipeline.id)
    return PipelineRead(
        id=pipeline.id,
        dataset_id=pipeline.dataset_id,
        name=pipeline.name,
        description=pipeline.description,
        schedule=pipeline.schedule,
        active=pipeline.active,
        source_type=config.get("sourceType", config.get("mode", "simulated")),
        kaggle_dataset_ref=config.get("kaggleDatasetRef"),
        kaggle_category=config.get("kaggleCategory"),
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

    source_type = payload.source_type
    kaggle_dataset_ref = payload.kaggle_dataset_ref or payload.kaggle_dataset
    if payload.kaggle_dataset and payload.source_type == "simulated":
        source_type = "kaggle_specific"
    if source_type == "kaggle_specific":
        if kaggle_dataset_ref is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A Kaggle dataset URL or slug is required.")
        kaggle_dataset_ref = normalize_dataset_ref(kaggle_dataset_ref)
    kaggle_category = payload.kaggle_category
    if source_type == "kaggle_latest_category" and kaggle_category is None:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="A Kaggle topic or category is required.")

    pipeline = Pipeline(
        dataset_id=payload.dataset_id,
        name=payload.name,
        description=payload.description,
        schedule=payload.schedule,
        active=payload.active,
        kaggle_dataset=kaggle_dataset_ref,
    )
    session.add(pipeline)
    session.flush()

    session.add(
        PipelineVersion(
            pipeline_id=pipeline.id,
            version_number=1,
            active=True,
            config=build_pipeline_config(source_type, kaggle_dataset_ref, kaggle_category),
        )
    )
    session.commit()
    session.refresh(pipeline)
    return pipeline


def build_pipeline_config(source_type: str, kaggle_dataset_ref: str | None, kaggle_category: str | None) -> dict:
    return {
        "sourceType": source_type,
        "mode": source_type,
        "runtimeSeconds": settings.simulation_runtime_seconds,
        "recordsProcessed": settings.default_records_processed,
        "kaggleDatasetRef": kaggle_dataset_ref,
        "kaggleCategory": kaggle_category,
        "steps": default_steps_for_source(source_type),
    }


def active_pipeline_version(pipeline: Pipeline) -> PipelineVersion | None:
    return next((version for version in pipeline.versions if version.active), None)


def list_pipeline_versions(session: Session, pipeline_id: int) -> list[PipelineVersion]:
    pipeline = session.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline was not found.")
    return session.scalars(
        select(PipelineVersion).where(PipelineVersion.pipeline_id == pipeline_id).order_by(PipelineVersion.version_number.desc())
    ).all()


def activate_pipeline_version(session: Session, pipeline_id: int, version_number: int) -> PipelineVersion:
    pipeline = session.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline was not found.")

    selected_version = session.scalar(
        select(PipelineVersion).where(
            PipelineVersion.pipeline_id == pipeline_id,
            PipelineVersion.version_number == version_number,
        )
    )
    if selected_version is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline version was not found.")

    versions = session.scalars(select(PipelineVersion).where(PipelineVersion.pipeline_id == pipeline_id)).all()
    for version in versions:
        version.active = version.id == selected_version.id
    session.commit()
    session.refresh(selected_version)
    return selected_version


def update_pipeline(session: Session, pipeline_id: int, payload: PipelineUpdate) -> Pipeline:
    pipeline = session.get(Pipeline, pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline was not found.")

    changes = payload.model_dump(exclude_unset=True)
    for field, value in changes.items():
        setattr(pipeline, field, value)

    if "kaggle_dataset" in changes:
        active_version = active_pipeline_version(pipeline)
        if active_version is not None:
            config = dict(active_version.config)
            config["kaggleDatasetRef"] = changes["kaggle_dataset"]
            if changes["kaggle_dataset"]:
                config["sourceType"] = "kaggle_specific"
                config["mode"] = "kaggle_specific"
                config["steps"] = default_steps_for_source("kaggle_specific")
            next_version_number = max((version.version_number for version in pipeline.versions), default=0) + 1
            active_version.active = False
            session.add(
                PipelineVersion(
                    pipeline_id=pipeline.id,
                    version_number=next_version_number,
                    active=True,
                    config=config,
                )
            )

    session.commit()
    session.refresh(pipeline)
    return pipeline
