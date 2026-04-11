from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy import Select, select
from sqlalchemy.orm import Session

from app.enums import AlertRuleType, AlertStatus
from app.models import Alert, AlertRule, Pipeline, Run
from app.schemas import AlertRuleCreate, AlertUpdate


VALID_ALERT_TRANSITIONS: dict[AlertStatus, set[AlertStatus]] = {
    AlertStatus.OPEN: {AlertStatus.ACKNOWLEDGED, AlertStatus.RESOLVED},
    AlertStatus.ACKNOWLEDGED: {AlertStatus.RESOLVED},
    AlertStatus.RESOLVED: set(),
}


def _normalize_timestamp(value):
    if value is None or value.tzinfo is None:
        return value
    return value.replace(tzinfo=None)


def create_alert_rule(session: Session, payload: AlertRuleCreate) -> AlertRule:
    pipeline = session.get(Pipeline, payload.pipeline_id)
    if pipeline is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pipeline was not found.")

    rule = AlertRule(
        pipeline_id=payload.pipeline_id,
        name=payload.name,
        rule_type=payload.rule_type,
        threshold_seconds=payload.threshold_seconds if payload.rule_type == AlertRuleType.RUNTIME_EXCEEDED else None,
        severity=payload.severity,
        enabled=payload.enabled,
    )
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return rule


def build_alert_message(rule: AlertRule, run: Run, runtime_seconds: int | None) -> str:
    if rule.rule_type == AlertRuleType.RUN_FAILED:
        error = run.error_message or "No error message was provided."
        return f"Run {run.id} for pipeline {run.pipeline_id} failed. {error}"

    threshold = rule.threshold_seconds or 0
    actual_runtime = runtime_seconds or 0
    return (
        f"Run {run.id} for pipeline {run.pipeline_id} exceeded the runtime threshold "
        f"of {threshold}s with {actual_runtime}s."
    )


def evaluate_run_alerts(session: Session, run: Run) -> None:
    rules = session.scalars(
        select(AlertRule).where(AlertRule.pipeline_id == run.pipeline_id, AlertRule.enabled.is_(True))
    ).all()

    runtime_seconds: int | None = None
    if run.started_at and run.finished_at:
        runtime_seconds = int(
            (_normalize_timestamp(run.finished_at) - _normalize_timestamp(run.started_at)).total_seconds()
        )

    for rule in rules:
        should_fire = False
        if rule.rule_type == AlertRuleType.RUN_FAILED and run.status.value == "failed":
            should_fire = True
        elif (
            rule.rule_type == AlertRuleType.RUNTIME_EXCEEDED
            and runtime_seconds is not None
            and rule.threshold_seconds is not None
            and runtime_seconds > rule.threshold_seconds
        ):
            should_fire = True

        if not should_fire:
            continue

        existing_alert = session.scalar(
            select(Alert).where(Alert.rule_id == rule.id, Alert.run_id == run.id)
        )
        if existing_alert is not None:
            continue

        session.add(
            Alert(
                rule_id=rule.id,
                run_id=run.id,
                pipeline_id=run.pipeline_id,
                message=build_alert_message(rule, run, runtime_seconds),
                severity=rule.severity,
                status=AlertStatus.OPEN,
            )
        )


def list_alerts_query(pipeline_id: int | None = None, alert_status: AlertStatus | None = None) -> Select[tuple[Alert]]:
    query = select(Alert).order_by(Alert.created_at.desc())
    if pipeline_id is not None:
        query = query.where(Alert.pipeline_id == pipeline_id)
    if alert_status is not None:
        query = query.where(Alert.status == alert_status)
    return query


def update_alert(session: Session, alert_id: int, payload: AlertUpdate) -> Alert:
    alert = session.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert was not found.")

    if payload.status not in VALID_ALERT_TRANSITIONS[alert.status]:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid alert status transition: {alert.status.value} -> {payload.status.value}",
        )

    alert.status = payload.status
    session.commit()
    session.refresh(alert)
    return alert
