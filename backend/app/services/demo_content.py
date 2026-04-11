from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.enums import AlertRuleType, AlertSeverity, AlertStatus, RunStatus
from app.models import Alert, AlertRule, Dataset, Pipeline, PipelineVersion, Run
from app.services.alerts import build_alert_message
from app.services.runs import runtime_seconds


def _day_anchor(now: datetime) -> datetime:
    return now.astimezone(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)


def _completed_run(
    pipeline_id: int,
    *,
    version_number: int,
    started_at: datetime,
    runtime_seconds_value: int,
    status: RunStatus,
    records_processed: int,
    error_message: str | None = None,
) -> Run:
    return Run(
        pipeline_id=pipeline_id,
        pipeline_version_number=version_number,
        status=status,
        started_at=started_at,
        finished_at=started_at + timedelta(seconds=runtime_seconds_value),
        records_processed=records_processed,
        error_message=error_message,
        created_at=started_at,
    )


def _seed_sales_runs(day_anchor: datetime, pipeline_id: int) -> list[Run]:
    runs: list[Run] = []
    for days_ago in range(12, 0, -1):
        started_at = day_anchor - timedelta(days=days_ago) + timedelta(hours=2, minutes=4)
        if days_ago in {9, 4}:
            runs.append(
                _completed_run(
                    pipeline_id,
                    version_number=1,
                    started_at=started_at,
                    runtime_seconds_value=398,
                    status=RunStatus.FAILED,
                    records_processed=0,
                    error_message="Warehouse timeout while loading refund partitions.",
                )
            )
            continue

        runs.append(
            _completed_run(
                pipeline_id,
                version_number=1,
                started_at=started_at,
                runtime_seconds_value=320 + (days_ago % 4) * 38,
                status=RunStatus.SUCCESS,
                records_processed=132_000 + days_ago * 2_450,
            )
        )
    return runs


def _seed_events_runs(day_anchor: datetime, pipeline_id: int) -> list[Run]:
    runs: list[Run] = []
    for days_ago in range(12, 0, -1):
        started_at = day_anchor - timedelta(days=days_ago) + timedelta(hours=3, minutes=30)
        runs.append(
            _completed_run(
                pipeline_id,
                version_number=1,
                started_at=started_at,
                runtime_seconds_value=245 + (days_ago % 5) * 42,
                status=RunStatus.SUCCESS,
                records_processed=84_000 + days_ago * 1_900,
            )
        )
    return runs


def _seed_logs_runs(day_anchor: datetime, pipeline_id: int) -> list[Run]:
    runs: list[Run] = []
    for slot in range(14, 2, -1):
        started_at = day_anchor - timedelta(days=4) + timedelta(hours=slot * 6)
        status = RunStatus.FAILED if slot in {11, 5} else RunStatus.SUCCESS
        runs.append(
            _completed_run(
                pipeline_id,
                version_number=1,
                started_at=started_at,
                runtime_seconds_value=155 + (slot % 3) * 32,
                status=status,
                records_processed=0 if status == RunStatus.FAILED else 61_000 + slot * 870,
                error_message="Incident parser stalled on malformed log batch." if status == RunStatus.FAILED else None,
            )
        )
    return runs


def _seed_inventory_runs(now: datetime, pipeline_id: int) -> list[Run]:
    runs: list[Run] = []
    latest_slot = now.replace(second=0, microsecond=0, minute=(now.minute // 15) * 15)
    for slot_offset in range(8, 1, -1):
        started_at = latest_slot - timedelta(minutes=slot_offset * 15) + timedelta(minutes=1)
        status = RunStatus.FAILED if slot_offset == 5 else RunStatus.SUCCESS
        runs.append(
            _completed_run(
                pipeline_id,
                version_number=1,
                started_at=started_at,
                runtime_seconds_value=78 + (slot_offset % 4) * 28,
                status=status,
                records_processed=0 if status == RunStatus.FAILED else 19_500 + slot_offset * 620,
                error_message="Freshness window exceeded while joining warehouse inventory snapshots."
                if status == RunStatus.FAILED
                else None,
            )
        )
    return runs


def seed_demo_content(session: Session) -> None:
    existing_demo_dataset = session.scalar(
        select(Dataset.id).where(Dataset.name == "customer_transactions").limit(1)
    )
    if existing_demo_dataset is not None:
        return

    now = datetime.now(timezone.utc)
    day_anchor = _day_anchor(now)

    datasets = [
        Dataset(
            name="customer_transactions",
            description="Raw e-commerce transaction feed used for finance and operations reporting.",
            owner="analytics-team",
            schema_version=3,
            created_at=now - timedelta(days=20),
            updated_at=now - timedelta(days=1, hours=4),
        ),
        Dataset(
            name="customer_events",
            description="Web and mobile clickstream events for funnel and feature analytics.",
            owner="product-analytics",
            schema_version=5,
            created_at=now - timedelta(days=18),
            updated_at=now - timedelta(hours=10),
        ),
        Dataset(
            name="platform_logs",
            description="Application logs normalized for reliability monitoring and support dashboards.",
            owner="platform-team",
            schema_version=2,
            created_at=now - timedelta(days=16),
            updated_at=now - timedelta(hours=6),
        ),
        Dataset(
            name="inventory_snapshots",
            description="Inventory point-in-time snapshots used to track freshness and stock deltas.",
            owner="supply-analytics",
            schema_version=4,
            created_at=now - timedelta(days=12),
            updated_at=now - timedelta(minutes=48),
        ),
    ]
    session.add_all(datasets)
    session.flush()

    pipelines = [
        Pipeline(
            dataset_id=datasets[0].id,
            name="daily-revenue-aggregation",
            description="Aggregates daily revenue, refunds, and payment-method KPIs.",
            schedule="0 2 * * *",
            active=True,
            created_at=now - timedelta(days=18),
            updated_at=now - timedelta(hours=2),
        ),
        Pipeline(
            dataset_id=datasets[1].id,
            name="feature-engagement-scoring",
            description="Builds engagement scores for new product features from clickstream activity.",
            schedule="30 3 * * *",
            active=True,
            created_at=now - timedelta(days=16),
            updated_at=now - timedelta(hours=3),
        ),
        Pipeline(
            dataset_id=datasets[2].id,
            name="incident-log-rollup",
            description="Summarizes platform incidents and error spikes from normalized logs.",
            schedule="0 */6 * * *",
            active=False,
            created_at=now - timedelta(days=14),
            updated_at=now - timedelta(days=1, hours=1),
        ),
        Pipeline(
            dataset_id=datasets[3].id,
            name="inventory-freshness-watch",
            description="Tracks delayed inventory snapshots and flags freshness regressions for operations teams.",
            schedule="*/15 * * * *",
            active=True,
            created_at=now - timedelta(days=10),
            updated_at=now - timedelta(minutes=32),
        ),
    ]
    session.add_all(pipelines)
    session.flush()

    session.add_all(
        [
            PipelineVersion(
                pipeline_id=pipelines[0].id,
                version_number=1,
                active=True,
                config={"mode": "simulated", "engine": "spark", "runtimeSeconds": 2},
                created_at=now - timedelta(days=18),
            ),
            PipelineVersion(
                pipeline_id=pipelines[1].id,
                version_number=1,
                active=True,
                config={"mode": "simulated", "engine": "dbt", "runtimeSeconds": 2},
                created_at=now - timedelta(days=16),
            ),
            PipelineVersion(
                pipeline_id=pipelines[2].id,
                version_number=1,
                active=True,
                config={"mode": "simulated", "engine": "sql", "runtimeSeconds": 2},
                created_at=now - timedelta(days=14),
            ),
            PipelineVersion(
                pipeline_id=pipelines[3].id,
                version_number=1,
                active=True,
                config={"mode": "simulated", "engine": "flink", "runtimeSeconds": 2},
                created_at=now - timedelta(days=10),
            ),
        ]
    )

    sales_runs = _seed_sales_runs(day_anchor, pipelines[0].id)
    events_runs = _seed_events_runs(day_anchor, pipelines[1].id)
    logs_runs = _seed_logs_runs(day_anchor, pipelines[2].id)
    inventory_runs = _seed_inventory_runs(now, pipelines[3].id)
    session.add_all([*sales_runs, *events_runs, *logs_runs, *inventory_runs])
    session.flush()

    sales_failure_rule = AlertRule(
        pipeline_id=pipelines[0].id,
        name="Revenue pipeline failure",
        rule_type=AlertRuleType.RUN_FAILED,
        threshold_seconds=None,
        severity=AlertSeverity.HIGH,
        enabled=True,
        created_at=now - timedelta(days=12),
    )
    events_runtime_rule = AlertRule(
        pipeline_id=pipelines[1].id,
        name="Engagement runtime threshold",
        rule_type=AlertRuleType.RUNTIME_EXCEEDED,
        threshold_seconds=300,
        severity=AlertSeverity.MEDIUM,
        enabled=True,
        created_at=now - timedelta(days=12),
    )
    logs_failure_rule = AlertRule(
        pipeline_id=pipelines[2].id,
        name="Log rollup failure",
        rule_type=AlertRuleType.RUN_FAILED,
        threshold_seconds=None,
        severity=AlertSeverity.LOW,
        enabled=False,
        created_at=now - timedelta(days=11),
    )
    inventory_runtime_rule = AlertRule(
        pipeline_id=pipelines[3].id,
        name="Inventory freshness runtime threshold",
        rule_type=AlertRuleType.RUNTIME_EXCEEDED,
        threshold_seconds=120,
        severity=AlertSeverity.MEDIUM,
        enabled=True,
        created_at=now - timedelta(days=9),
    )
    inventory_failure_rule = AlertRule(
        pipeline_id=pipelines[3].id,
        name="Inventory freshness failures",
        rule_type=AlertRuleType.RUN_FAILED,
        threshold_seconds=None,
        severity=AlertSeverity.HIGH,
        enabled=True,
        created_at=now - timedelta(days=9),
    )
    session.add_all(
        [
            sales_failure_rule,
            events_runtime_rule,
            logs_failure_rule,
            inventory_runtime_rule,
            inventory_failure_rule,
        ]
    )
    session.flush()

    alerts = [
        Alert(
            rule_id=sales_failure_rule.id,
            run_id=sales_runs[3].id,
            pipeline_id=pipelines[0].id,
            message=build_alert_message(sales_failure_rule, sales_runs[3], runtime_seconds(sales_runs[3])),
            severity=sales_failure_rule.severity,
            status=AlertStatus.RESOLVED,
            created_at=sales_runs[3].finished_at,
        ),
        Alert(
            rule_id=sales_failure_rule.id,
            run_id=sales_runs[8].id,
            pipeline_id=pipelines[0].id,
            message=build_alert_message(sales_failure_rule, sales_runs[8], runtime_seconds(sales_runs[8])),
            severity=sales_failure_rule.severity,
            status=AlertStatus.OPEN,
            created_at=sales_runs[8].finished_at,
        ),
        Alert(
            rule_id=events_runtime_rule.id,
            run_id=events_runs[-2].id,
            pipeline_id=pipelines[1].id,
            message=build_alert_message(events_runtime_rule, events_runs[-2], runtime_seconds(events_runs[-2])),
            severity=events_runtime_rule.severity,
            status=AlertStatus.RESOLVED,
            created_at=events_runs[-2].finished_at,
        ),
        Alert(
            rule_id=events_runtime_rule.id,
            run_id=events_runs[8].id,
            pipeline_id=pipelines[1].id,
            message=build_alert_message(events_runtime_rule, events_runs[8], runtime_seconds(events_runs[8])),
            severity=events_runtime_rule.severity,
            status=AlertStatus.ACKNOWLEDGED,
            created_at=events_runs[8].finished_at,
        ),
        Alert(
            rule_id=inventory_runtime_rule.id,
            run_id=inventory_runs[-2].id,
            pipeline_id=pipelines[3].id,
            message=build_alert_message(
                inventory_runtime_rule, inventory_runs[-2], runtime_seconds(inventory_runs[-2])
            ),
            severity=inventory_runtime_rule.severity,
            status=AlertStatus.OPEN,
            created_at=inventory_runs[-2].finished_at,
        ),
        Alert(
            rule_id=inventory_failure_rule.id,
            run_id=inventory_runs[3].id,
            pipeline_id=pipelines[3].id,
            message=build_alert_message(
                inventory_failure_rule, inventory_runs[3], runtime_seconds(inventory_runs[3])
            ),
            severity=inventory_failure_rule.severity,
            status=AlertStatus.RESOLVED,
            created_at=inventory_runs[3].finished_at,
        ),
    ]
    session.add_all(alerts)
    session.commit()
