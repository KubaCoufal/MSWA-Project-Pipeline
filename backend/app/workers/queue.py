from __future__ import annotations

from redis import Redis

from app.core.config import settings


def get_redis_connection() -> Redis:
    return Redis.from_url(settings.redis_url)


def get_queue():
    from rq import Queue

    return Queue(settings.rq_queue_name, connection=get_redis_connection())


def enqueue_run_processing(run_id: int) -> str:
    from rq import Retry

    queue = get_queue()
    retry_count = max(settings.rq_job_retry_count, 0)
    job = queue.enqueue(
        "app.workers.tasks.process_run",
        run_id,
        job_timeout=max(settings.rq_job_timeout_seconds, 1),
        failure_ttl=86400,
        retry=Retry(max=retry_count, interval=[10, 30, 60][:retry_count]) if retry_count else None,
    )
    return job.id
