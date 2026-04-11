from __future__ import annotations

from app.core.config import settings
from app.workers.queue import get_redis_connection


def main() -> None:
    from rq import Connection, Worker

    with Connection(get_redis_connection()):
        worker = Worker([settings.rq_queue_name])
        worker.work(with_scheduler=False)


if __name__ == "__main__":
    main()
