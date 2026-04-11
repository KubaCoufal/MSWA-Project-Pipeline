"""Initial schema."""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260411_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.Enum("admin", "operator", "viewer", name="user_role", native_enum=False), nullable=False),
    )

    op.create_table(
        "datasets",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner", sa.String(length=120), nullable=False),
        sa.Column("schema_version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "pipelines",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("dataset_id", sa.Integer(), sa.ForeignKey("datasets.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False, unique=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("schedule", sa.String(length=120), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_pipelines_dataset_id", "pipelines", ["dataset_id"])

    op.create_table(
        "pipeline_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pipeline_id", sa.Integer(), sa.ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("config", sa.JSON(), nullable=False),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("pipeline_id", "version_number", name="uq_pipeline_versions_number"),
    )
    op.create_index("ix_pipeline_versions_pipeline_id", "pipeline_versions", ["pipeline_id"])

    op.create_table(
        "runs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pipeline_id", sa.Integer(), sa.ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pipeline_version_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.Enum("pending", "running", "success", "failed", name="run_status", native_enum=False), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("records_processed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_runs_pipeline_id", "runs", ["pipeline_id"])

    op.create_table(
        "alert_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("pipeline_id", sa.Integer(), sa.ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column(
            "rule_type",
            sa.Enum("run_failed", "runtime_exceeded", name="alert_rule_type", native_enum=False),
            nullable=False,
        ),
        sa.Column("threshold_seconds", sa.Integer(), nullable=True),
        sa.Column("severity", sa.Enum("low", "medium", "high", name="alert_severity", native_enum=False), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_alert_rules_pipeline_id", "alert_rules", ["pipeline_id"])

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("rule_id", sa.Integer(), sa.ForeignKey("alert_rules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("run_id", sa.Integer(), sa.ForeignKey("runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pipeline_id", sa.Integer(), sa.ForeignKey("pipelines.id", ondelete="CASCADE"), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("severity", sa.Enum("low", "medium", "high", name="alert_severity", native_enum=False), nullable=False),
        sa.Column("status", sa.Enum("open", "acknowledged", "resolved", name="alert_status", native_enum=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.UniqueConstraint("rule_id", "run_id", name="uq_alert_rule_run"),
    )
    op.create_index("ix_alerts_pipeline_id", "alerts", ["pipeline_id"])
    op.create_index("ix_alerts_run_id", "alerts", ["run_id"])


def downgrade() -> None:
    op.drop_index("ix_alerts_run_id", table_name="alerts")
    op.drop_index("ix_alerts_pipeline_id", table_name="alerts")
    op.drop_table("alerts")
    op.drop_index("ix_alert_rules_pipeline_id", table_name="alert_rules")
    op.drop_table("alert_rules")
    op.drop_index("ix_runs_pipeline_id", table_name="runs")
    op.drop_table("runs")
    op.drop_index("ix_pipeline_versions_pipeline_id", table_name="pipeline_versions")
    op.drop_table("pipeline_versions")
    op.drop_index("ix_pipelines_dataset_id", table_name="pipelines")
    op.drop_table("pipelines")
    op.drop_table("datasets")
    op.drop_table("users")
