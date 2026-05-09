from __future__ import annotations

import asyncio

from app.core.config import settings
from app.services.scheduler import run_fake_scheduler


async def main() -> None:
    if not settings.fake_scheduler_enabled:
        return

    await run_fake_scheduler(asyncio.Event())


if __name__ == "__main__":
    asyncio.run(main())
