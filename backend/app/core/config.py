from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Big Data Pipeline Monitor"
    database_url: str = Field(default="sqlite:///./pipeline_monitor.db", alias="DATABASE_URL")
    redis_url: str = Field(default="redis://localhost:6379/0", alias="REDIS_URL")
    rq_queue_name: str = Field(default="pipeline-monitor", alias="RQ_QUEUE_NAME")
    simulation_runtime_seconds: int = Field(default=2, alias="SIMULATION_RUNTIME_SECONDS")
    default_records_processed: int = Field(default=1200, alias="DEFAULT_RECORDS_PROCESSED")
    cors_origins: list[str] = Field(default=["http://localhost:4173", "http://localhost:5173"], alias="CORS_ORIGINS")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
