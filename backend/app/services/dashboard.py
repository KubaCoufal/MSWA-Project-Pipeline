from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.enums import AlertStatus, RunStatus
from app.models import Alert, Dataset, Pipeline, Run
from app.schemas import DashboardSummary


def get_dashboard_summary(session: Session) -> DashboardSummary:
    since = datetime.now(timezone.utc) - timedelta(days=7)

    dataset_count = session.scalar(select(func.count(Dataset.id))) or 0
    pipeline_count = session.scalar(select(func.count(Pipeline.id))) or 0
    active_pipeline_count = session.scalar(select(func.count(Pipeline.id)).where(Pipeline.active.is_(True))) or 0
    recent_run_count = session.scalar(select(func.count(Run.id)).where(Run.created_at >= since)) or 0
    failed_run_count = session.scalar(select(func.count(Run.id)).where(Run.status == RunStatus.FAILED)) or 0
    open_alert_count = (
        session.scalar(select(func.count(Alert.id)).where(Alert.status == AlertStatus.OPEN)) or 0
    )

    return DashboardSummary(
        dataset_count=dataset_count,
        pipeline_count=pipeline_count,
        active_pipeline_count=active_pipeline_count,
        recent_run_count=recent_run_count,
        failed_run_count=failed_run_count,
        open_alert_count=open_alert_count,
    )
