from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from croniter import CroniterBadCronError, croniter
from sqlalchemy import select
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db import SessionLocal
from app.enums import RunStatus
from app.models import Pipeline, Run
from app.services.runs import create_run


logger = logging.getLogger(__name__)


def _try_scheduler_lock(session: Session) -> bool:
    if not settings.database_url.startswith("postgres"):
        return True
    return bool(session.scalar(text("SELECT pg_try_advisory_lock(:lock_id)"), {"lock_id": settings.scheduler_lock_id}))


def _release_scheduler_lock(session: Session) -> None:
    if settings.database_url.startswith("postgres"):
        session.execute(text("SELECT pg_advisory_unlock(:lock_id)"), {"lock_id": settings.scheduler_lock_id})


def latest_due_time(schedule: str, now: datetime) -> datetime | None:
    try:
        due_time = croniter(schedule, now).get_prev(datetime)
    except (CroniterBadCronError, ValueError):
        logger.warning("Skipping invalid schedule during fake scheduling: %s", schedule)
        return None

    if due_time.tzinfo is None:
        return due_time.replace(tzinfo=now.tzinfo)
    return due_time


def sync_due_scheduled_runs(session: Session, now: datetime | None = None) -> list[int]:
    if not _try_scheduler_lock(session):
        logger.info("Another scheduler instance owns the scheduler lock; skipping this tick.")
        return []

    current_time = now or datetime.now(timezone.utc)
    created_run_ids: list[int] = []
    try:
        pipeline_ids = session.scalars(
            select(Pipeline.id).where(Pipeline.active.is_(True), Pipeline.schedule.is_not(None)).order_by(Pipeline.id)
        ).all()

        for pipeline_id in pipeline_ids:
            pipeline = session.get(Pipeline, pipeline_id)
            if pipeline is None or not pipeline.schedule:
                continue

            due_time = latest_due_time(pipeline.schedule, current_time)
            if due_time is None:
                continue

            inflight_run = session.scalar(
                select(Run.id).where(
                    Run.pipeline_id == pipeline.id,
                    Run.status.in_([RunStatus.PENDING, RunStatus.RUNNING]),
                )
            )
            if inflight_run is not None:
                continue

            existing_due_run = session.scalar(
                select(Run.id)
                .where(Run.pipeline_id == pipeline.id, Run.created_at >= due_time)
                .order_by(Run.created_at.desc())
                .limit(1)
            )
            if existing_due_run is not None:
                continue

            try:
                run = create_run(session, pipeline.id)
            except Exception:
                logger.exception("Failed to create a fake scheduled run for pipeline %s.", pipeline.id)
                continue

            created_run_ids.append(run.id)
            logger.info("Created fake scheduled run %s for pipeline %s.", run.id, pipeline.id)
    finally:
        _release_scheduler_lock(session)

    return created_run_ids


async def run_fake_scheduler(stop_event: asyncio.Event) -> None:
    while not stop_event.is_set():
        try:
            with SessionLocal() as session:
                sync_due_scheduled_runs(session)
        except Exception:
            logger.exception("Fake scheduler iteration failed.")

        try:
            await asyncio.wait_for(stop_event.wait(), timeout=max(settings.fake_scheduler_poll_seconds, 1))
        except asyncio.TimeoutError:
            continue
