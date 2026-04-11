from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.alert_rules import router as alert_rules_router
from app.api.routes.alerts import router as alerts_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.datasets import router as datasets_router
from app.api.routes.pipelines import router as pipelines_router
from app.api.routes.runs import router as runs_router
from app.core.config import settings
from app.db import Base, SessionLocal, engine
from app.services.demo_content import seed_demo_content
from app.services.demo_users import seed_demo_users


@asynccontextmanager
async def lifespan(_: FastAPI):
    if settings.database_url.startswith("sqlite"):
        Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        seed_demo_users(session)
        if settings.seed_demo_content:
            seed_demo_content(session)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(dashboard_router)
app.include_router(datasets_router)
app.include_router(pipelines_router)
app.include_router(runs_router)
app.include_router(alert_rules_router)
app.include_router(alerts_router)
