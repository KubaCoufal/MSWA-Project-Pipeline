from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_demo_token
from app.db import get_session
from app.models import User
from app.schemas import DemoTokenCreate, DemoTokenRead

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/demo-token", response_model=DemoTokenRead)
def issue_demo_token(payload: DemoTokenCreate, session: Annotated[Session, Depends(get_session)]) -> DemoTokenRead:
    if settings.auth_mode != "demo":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Demo token login is disabled.")

    user = session.get(User, payload.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown demo user.")

    return DemoTokenRead(access_token=create_demo_token(user.id), expires_in=settings.demo_jwt_ttl_minutes * 60)
