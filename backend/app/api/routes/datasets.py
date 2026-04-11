from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import get_current_user, require_roles
from app.db import get_session
from app.enums import UserRole
from app.models import Dataset
from app.schemas import DatasetCreate, DatasetRead

router = APIRouter(prefix="/datasets", tags=["datasets"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[DatasetRead])
def list_datasets(session: Annotated[Session, Depends(get_session)]) -> list[Dataset]:
    return session.scalars(select(Dataset).order_by(Dataset.created_at.desc())).all()


@router.post(
    "",
    response_model=DatasetRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)
def create_dataset(payload: DatasetCreate, session: Annotated[Session, Depends(get_session)]) -> Dataset:
    dataset = Dataset(**payload.model_dump())
    session.add(dataset)
    session.commit()
    session.refresh(dataset)
    return dataset


@router.get("/{dataset_id}", response_model=DatasetRead)
def get_dataset(dataset_id: int, session: Annotated[Session, Depends(get_session)]) -> Dataset:
    dataset = session.get(Dataset, dataset_id)
    if dataset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Dataset was not found.")
    return dataset
