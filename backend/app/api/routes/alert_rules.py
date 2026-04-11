from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import require_roles
from app.db import get_session
from app.enums import UserRole
from app.models import AlertRule
from app.schemas import AlertRuleCreate, AlertRuleRead
from app.services.alerts import create_alert_rule

router = APIRouter(prefix="/alert-rules", tags=["alert-rules"])


@router.get("", response_model=list[AlertRuleRead])
def list_alert_rules(
    session: Annotated[Session, Depends(get_session)],
    pipeline_id: int | None = None,
) -> list[AlertRule]:
    query = select(AlertRule).order_by(AlertRule.created_at.desc())
    if pipeline_id is not None:
        query = query.where(AlertRule.pipeline_id == pipeline_id)
    return session.scalars(query).all()


@router.post(
    "",
    response_model=AlertRuleRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles(UserRole.ADMIN))],
)
def create_alert_rule_route(
    payload: AlertRuleCreate,
    session: Annotated[Session, Depends(get_session)],
) -> AlertRule:
    return create_alert_rule(session, payload)


@router.get("/{rule_id}", response_model=AlertRuleRead)
def get_alert_rule(rule_id: int, session: Annotated[Session, Depends(get_session)]) -> AlertRule:
    rule = session.get(AlertRule, rule_id)
    if rule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert rule was not found.")
    return rule
