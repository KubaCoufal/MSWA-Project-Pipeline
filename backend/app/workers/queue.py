from __future__ import annotations

from redis import Redis

from app.core.config import settings


def get_redis_connection() -> Redis:
    return Redis.from_url(settings.redis_url)


def get_queue():
    from rq import Queue

    return Queue(settings.rq_queue_name, connection=get_redis_connection())


def enqueue_run_processing(run_id: int) -> None:
    queue = get_queue()
    queue.enqueue("app.workers.tasks.process_run", run_id)
