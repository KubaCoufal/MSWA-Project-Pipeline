from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import AlertRuleType, AlertSeverity, AlertStatus, RunStatus
from app.models import Alert, AlertRule, Dataset, Pipeline, PipelineVersion, Run


def seed_demo_content(session: Session) -> None:
    existing_dataset = session.scalar(select(Dataset.id).limit(1))
    if existing_dataset is not None:
        return

    now = datetime.now(timezone.utc)

    dataset_sales = Dataset(
        name="customer_transactions",
        description="Raw e-commerce transaction feed used for finance and operations reporting.",
        owner="analytics-team",
        schema_version=3,
        created_at=now - timedelta(days=18),
        updated_at=now - timedelta(days=1),
    )
    dataset_events = Dataset(
        name="customer_events",
        description="Web and mobile clickstream events for funnel and feature analytics.",
        owner="product-analytics",
        schema_version=5,
        created_at=now - timedelta(days=16),
        updated_at=now - timedelta(hours=10),
    )
    dataset_logs = Dataset(
        name="platform_logs",
        description="Application logs normalized for reliability monitoring and support dashboards.",
        owner="platform-team",
        schema_version=2,
        created_at=now - timedelta(days=12),
        updated_at=now - timedelta(hours=4),
    )
    session.add_all([dataset_sales, dataset_events, dataset_logs])
    session.flush()

    sales_pipeline = Pipeline(
        dataset_id=dataset_sales.id,
        name="daily-revenue-aggregation",
        description="Aggregates daily revenue, refunds, and payment-method KPIs.",
        schedule="0 2 * * *",
        active=True,
        created_at=now - timedelta(days=15),
        updated_at=now - timedelta(hours=2),
    )
    events_pipeline = Pipeline(
        dataset_id=dataset_events.id,
        name="feature-engagement-scoring",
        description="Builds engagement scores for new product features from clickstream activity.",
        schedule="30 3 * * *",
        active=True,
        created_at=now - timedelta(days=14),
        updated_at=now - timedelta(hours=3),
    )
    logs_pipeline = Pipeline(
        dataset_id=dataset_logs.id,
        name="incident-log-rollup",
        description="Summarizes platform incidents and error spikes from normalized logs.",
        schedule="0 */6 * * *",
        active=False,
        created_at=now - timedelta(days=13),
        updated_at=now - timedelta(days=1),
    )
    session.add_all([sales_pipeline, events_pipeline, logs_pipeline])
    session.flush()

    session.add_all(
        [
            PipelineVersion(
                pipeline_id=sales_pipeline.id,
                version_number=1,
                active=True,
                config={"mode": "simulated", "engine": "spark", "runtimeSeconds": 2},
                created_at=now - timedelta(days=15),
            ),
            PipelineVersion(
                pipeline_id=events_pipeline.id,
                version_number=1,
                active=True,
                config={"mode": "simulated", "engine": "dbt", "runtimeSeconds": 2},
                created_at=now - timedelta(days=14),
            ),
            PipelineVersion(
                pipeline_id=logs_pipeline.id,
                version_number=1,
                active=True,
                config={"mode": "simulated", "engine": "sql", "runtimeSeconds": 2},
                created_at=now - timedelta(days=13),
            ),
        ]
    )

    sales_failed_run = Run(
        pipeline_id=sales_pipeline.id,
        pipeline_version_number=1,
        status=RunStatus.FAILED,
        started_at=now - timedelta(hours=9, minutes=14),
        finished_at=now - timedelta(hours=9, minutes=2),
        records_processed=0,
        error_message="Warehouse timeout while loading refund partitions.",
        created_at=now - timedelta(hours=9, minutes=14),
    )
    sales_success_run = Run(
        pipeline_id=sales_pipeline.id,
        pipeline_version_number=1,
        status=RunStatus.SUCCESS,
        started_at=now - timedelta(days=1, hours=1),
        finished_at=now - timedelta(days=1, hours=1) + timedelta(minutes=6),
        records_processed=145200,
        error_message=None,
        created_at=now - timedelta(days=1, hours=1),
    )
    events_running_run = Run(
        pipeline_id=events_pipeline.id,
        pipeline_version_number=1,
        status=RunStatus.RUNNING,
        started_at=now - timedelta(minutes=8),
        finished_at=None,
        records_processed=48120,
        error_message=None,
        created_at=now - timedelta(minutes=8),
    )
    logs_pending_run = Run(
        pipeline_id=logs_pipeline.id,
        pipeline_version_number=1,
        status=RunStatus.PENDING,
        started_at=None,
        finished_at=None,
        records_processed=0,
        error_message=None,
        created_at=now - timedelta(minutes=2),
    )
    session.add_all([sales_failed_run, sales_success_run, events_running_run, logs_pending_run])
    session.flush()

    failure_rule = AlertRule(
        pipeline_id=sales_pipeline.id,
        name="Revenue pipeline failure",
        rule_type=AlertRuleType.RUN_FAILED,
        threshold_seconds=None,
        severity=AlertSeverity.HIGH,
        enabled=True,
        created_at=now - timedelta(days=10),
    )
    runtime_rule = AlertRule(
        pipeline_id=events_pipeline.id,
        name="Engagement runtime threshold",
        rule_type=AlertRuleType.RUNTIME_EXCEEDED,
        threshold_seconds=300,
        severity=AlertSeverity.MEDIUM,
        enabled=True,
        created_at=now - timedelta(days=10),
    )
    logs_rule = AlertRule(
        pipeline_id=logs_pipeline.id,
        name="Log rollup failure",
        rule_type=AlertRuleType.RUN_FAILED,
        threshold_seconds=None,
        severity=AlertSeverity.LOW,
        enabled=False,
        created_at=now - timedelta(days=8),
    )
    session.add_all([failure_rule, runtime_rule, logs_rule])
    session.flush()

    session.add_all(
        [
            Alert(
                rule_id=failure_rule.id,
                run_id=sales_failed_run.id,
                pipeline_id=sales_pipeline.id,
                message="Run failed after warehouse timeout while loading refund partitions.",
                severity=AlertSeverity.HIGH,
                status=AlertStatus.OPEN,
                created_at=now - timedelta(hours=9, minutes=1),
            ),
            Alert(
                rule_id=runtime_rule.id,
                run_id=events_running_run.id,
                pipeline_id=events_pipeline.id,
                message="Current run is above the 5 minute runtime threshold and still running.",
                severity=AlertSeverity.MEDIUM,
                status=AlertStatus.ACKNOWLEDGED,
                created_at=now - timedelta(minutes=2),
            ),
        ]
    )

    session.commit()
