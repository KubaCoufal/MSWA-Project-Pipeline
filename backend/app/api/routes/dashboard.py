from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user
from app.db import get_session
from app.schemas import DashboardSummary, UserRead
from app.services.dashboard import get_dashboard_summary
from app.services.demo_users import DEMO_USERS

router = APIRouter(tags=["dashboard"], dependencies=[Depends(get_current_user)])


@router.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(session: Annotated[Session, Depends(get_session)]) -> DashboardSummary:
    return get_dashboard_summary(session)


@router.get("/meta/demo-users", response_model=list[UserRead])
def demo_users() -> list[UserRead]:
    if settings.auth_mode != "demo":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demo users metadata is only available in demo auth mode.",
        )
    return [UserRead.model_validate(user) for user in DEMO_USERS]
