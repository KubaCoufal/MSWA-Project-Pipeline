from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums import AlertRuleType, AlertSeverity, AlertStatus, RunStatus, UserRole


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class AppSchema(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class UserRead(AppSchema):
    id: int
    email: str
    display_name: str
    role: UserRole


class DatasetCreate(AppSchema):
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    owner: str = Field(min_length=2, max_length=120)
    schema_version: int = Field(default=1, ge=1)


class DatasetRead(AppSchema):
    id: int
    name: str
    description: str | None
    owner: str
    schema_version: int
    created_at: datetime
    updated_at: datetime


class PipelineCreate(AppSchema):
    dataset_id: int
    name: str = Field(min_length=2, max_length=120)
    description: str | None = None
    schedule: str | None = Field(default=None, max_length=120)
    active: bool = True


class PipelineUpdate(AppSchema):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = None
    schedule: str | None = Field(default=None, max_length=120)
    active: bool | None = None


class PipelineRead(AppSchema):
    id: int
    dataset_id: int
    name: str
    description: str | None
    schedule: str | None
    active: bool
    current_version_number: int
    latest_run_status: RunStatus | None = None
    latest_run_started_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class RunRead(AppSchema):
    id: int
    pipeline_id: int
    pipeline_version_number: int
    status: RunStatus
    started_at: datetime | None
    finished_at: datetime | None
    records_processed: int
    error_message: str | None
    runtime_seconds: int | None = None
    created_at: datetime


class RunUpdate(AppSchema):
    status: RunStatus
    error_message: str | None = None
    records_processed: int | None = Field(default=None, ge=0)


class AlertRuleCreate(AppSchema):
    pipeline_id: int
    name: str = Field(min_length=2, max_length=120)
    rule_type: AlertRuleType
    threshold_seconds: int | None = Field(default=None, ge=1)
    severity: AlertSeverity = AlertSeverity.MEDIUM
    enabled: bool = True

    @field_validator("threshold_seconds")
    @classmethod
    def validate_threshold(cls, value: int | None, info: Any) -> int | None:
        rule_type = info.data.get("rule_type")
        if rule_type == AlertRuleType.RUNTIME_EXCEEDED and value is None:
            raise ValueError("thresholdSeconds is required for runtime_exceeded rules.")
        return value


class AlertRuleRead(AppSchema):
    id: int
    pipeline_id: int
    name: str
    rule_type: AlertRuleType
    threshold_seconds: int | None
    severity: AlertSeverity
    enabled: bool
    created_at: datetime


class AlertRead(AppSchema):
    id: int
    rule_id: int
    run_id: int
    pipeline_id: int
    message: str
    severity: AlertSeverity
    status: AlertStatus
    created_at: datetime


class AlertUpdate(AppSchema):
    status: AlertStatus


class DashboardSummary(AppSchema):
    dataset_count: int
    pipeline_count: int
    active_pipeline_count: int
    recent_run_count: int
    failed_run_count: int
    open_alert_count: int
