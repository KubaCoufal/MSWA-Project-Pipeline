from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db import get_session
from app.enums import AlertStatus
from app.models import Alert
from app.schemas import AlertRead
from app.services.alerts import list_alerts_query

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=list[AlertRead])
def list_alerts(
    session: Annotated[Session, Depends(get_session)],
    pipeline_id: int | None = None,
    status_filter: Annotated[AlertStatus | None, Query(alias="status")] = None,
) -> list[Alert]:
    return session.scalars(list_alerts_query(pipeline_id=pipeline_id, alert_status=status_filter)).all()


@router.get("/{alert_id}", response_model=AlertRead)
def get_alert(alert_id: int, session: Annotated[Session, Depends(get_session)]) -> Alert:
    alert = session.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert was not found.")
    return alert
