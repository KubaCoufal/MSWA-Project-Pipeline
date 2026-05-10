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
    rq_job_timeout_seconds: int = Field(default=300, alias="RQ_JOB_TIMEOUT_SECONDS")
    rq_job_retry_count: int = Field(default=3, alias="RQ_JOB_RETRY_COUNT")
    simulation_runtime_seconds: int = Field(default=2, alias="SIMULATION_RUNTIME_SECONDS")
    default_records_processed: int = Field(default=1200, alias="DEFAULT_RECORDS_PROCESSED")
    cors_origins: list[str] = Field(
        default=[
            "http://localhost:4173",
            "http://localhost:5173",
            "http://127.0.0.1:4173",
            "http://127.0.0.1:5173",
        ],
        alias="CORS_ORIGINS",
    )
    seed_demo_content: bool = Field(default=True, alias="SEED_DEMO_CONTENT")
    auth_mode: str = Field(default="demo", alias="AUTH_MODE")
    demo_jwt_secret: str = Field(default="change-me-for-local-demo-only-32-bytes", alias="DEMO_JWT_SECRET")
    demo_jwt_ttl_minutes: int = Field(default=60, alias="DEMO_JWT_TTL_MINUTES")
    fake_scheduler_enabled: bool = Field(default=True, alias="FAKE_SCHEDULER_ENABLED")
    fake_scheduler_poll_seconds: int = Field(default=30, alias="FAKE_SCHEDULER_POLL_SECONDS")
    scheduler_lock_id: int = Field(default=527901, alias="SCHEDULER_LOCK_ID")
    keycloak_server_url: str = Field(default="http://localhost:8080", alias="KEYCLOAK_SERVER_URL")
    keycloak_realm: str = Field(default="pipeline-monitor", alias="KEYCLOAK_REALM")
    keycloak_client_id: str = Field(default="pipeline-monitor-web", alias="KEYCLOAK_CLIENT_ID")
    kaggle_username: str | None = Field(default=None, alias="KAGGLE_USERNAME")
    kaggle_key: str | None = Field(default=None, alias="KAGGLE_KEY")
    kaggle_max_download_mb: int = Field(default=50, alias="KAGGLE_MAX_DOWNLOAD_MB")

    @property
    def keycloak_issuer_url(self) -> str:
        return f"{self.keycloak_server_url.rstrip('/')}/realms/{self.keycloak_realm}"

    @property
    def keycloak_jwks_url(self) -> str:
        return f"{self.keycloak_issuer_url}/protocol/openid-connect/certs"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
