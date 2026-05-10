# Pipeline Monitor Backend

This directory contains the FastAPI backend for the Big Data Pipeline Monitor course project. It exposes the REST API, database models, migrations, role checks, seeded demo content, fake scheduler, and RQ worker task used to simulate pipeline execution.

## Stack

- FastAPI for the HTTP API
- Pydantic for request and response schemas
- SQLAlchemy for ORM models and queries
- Alembic for database migrations
- PostgreSQL for the Docker Compose environment and backend tests
- Redis Queue (RQ) and Redis for background run processing
- Pytest for backend tests

## Local Setup

Install the backend package with development dependencies:

```bash
python -m pip install -e .[dev]
```

Run the test suite:

```bash
python -m pytest
```

Start the API locally:

```bash
uvicorn app.main:app --reload
```

Local API URLs:

- Health check: `http://localhost:8000/health`
- OpenAPI docs: `http://localhost:8000/docs`
- ReDoc docs: `http://localhost:8000/redoc`

For the complete application, including PostgreSQL, Redis, frontend, backend load balancer, worker process, and scheduler, run Docker Compose from the repository root:

```bash
docker compose up --build
```

To demonstrate horizontal scaling, run multiple API and worker replicas:

```bash
docker compose up --build --scale backend=2 --scale worker=3
```

The public backend URL remains `http://localhost:8000`; Nginx forwards API requests to the backend replicas. Pipeline runs are claimed by the worker replicas through Redis/RQ.

## Main Endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Public health check |
| `GET /dashboard/summary` | Dashboard counts and summary metrics |
| `GET /meta/demo-users` | Demo user metadata in demo auth mode |
| `/datasets` | Dataset listing, creation, and detail access |
| `/pipelines` | Pipeline listing, creation, detail access, updates, and manual runs |
| `/pipelines/{id}/versions` | Pipeline version listing, activation, and selected-version runs |
| `/runs` | Run listing, detail access, and status updates |
| `/alert-rules` | Alert rule listing, creation, and detail access |
| `/alerts` | Alert listing, detail access, acknowledgement, and resolution |

The generated OpenAPI page at `/docs` is the source of truth for request and response schemas.

Routes are intentionally unprefixed rather than `/v1` because this course project is deployed as a lockstep monorepo. Introducing independent external clients would be the trigger for explicit API versioning.

## Authentication and Roles

The backend supports two authentication modes:

- `AUTH_MODE=demo`: issues short-lived signed JWTs from `/auth/demo-token` and validates them through the normal bearer-token dependency.
- `AUTH_MODE=keycloak`: validates Keycloak bearer tokens and maps realm roles to application roles.

Role behavior:

- `admin`: can manage metadata, start runs, update runs, and handle alerts.
- `operator`: can start/update runs and handle alerts.
- `viewer`: can read application data but cannot perform write operations.

The `/health` endpoint remains public in both modes.

## Environment Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite:///./pipeline_monitor.db` | SQLAlchemy database URL |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis connection URL |
| `RQ_QUEUE_NAME` | `pipeline-monitor` | Background queue name |
| `RQ_JOB_TIMEOUT_SECONDS` | `300` | RQ job timeout |
| `RQ_JOB_RETRY_COUNT` | `3` | RQ retry attempts for failed jobs |
| `SIMULATION_RUNTIME_SECONDS` | `2` | Artificial run duration used by the worker |
| `DEFAULT_RECORDS_PROCESSED` | `1200` | Simulated successful-run record count |
| `CORS_ORIGINS` | local frontend URLs | Allowed browser origins |
| `SEED_DEMO_CONTENT` | `true` | Enables seeded demo datasets, pipelines, runs, and alerts |
| `AUTH_MODE` | `demo` | `demo` or `keycloak` |
| `DEMO_JWT_SECRET` | local demo secret | HMAC secret used for demo JWTs |
| `DEMO_JWT_TTL_MINUTES` | `60` | Demo JWT lifetime |
| `FAKE_SCHEDULER_ENABLED` | `true` | Enables the simulated schedule poller |
| `FAKE_SCHEDULER_POLL_SECONDS` | `30` | Scheduler polling interval |
| `KEYCLOAK_SERVER_URL` | `http://localhost:8080` | Keycloak server URL |
| `KEYCLOAK_REALM` | `pipeline-monitor` | Keycloak realm |
| `KEYCLOAK_CLIENT_ID` | `pipeline-monitor-web` | Keycloak client ID |
| `KAGGLE_USERNAME` | unset | Kaggle API username for Kaggle EDA pipelines |
| `KAGGLE_KEY` | unset | Kaggle API key for Kaggle EDA pipelines |
| `KAGGLE_MAX_DOWNLOAD_MB` | `50` | Maximum Kaggle dataset size considered for latest-dataset runs |

## Worker and Scheduler

Manual or scheduled pipeline runs are created through the API, then enqueued for background processing. Simulated pipelines move a run from `pending` to `running`, wait for the configured simulation time, and then mark the run as `success` with simulated processed records. Kaggle EDA pipelines download a selected or latest published CSV dataset, calculate basic exploratory analysis, and store the result on the run.

RQ workers claim jobs from Redis, so multiple worker replicas can process independent runs. The fake scheduler checks active pipelines with valid cron schedules and creates due runs. On PostgreSQL it takes an advisory lock before creating runs, which prevents duplicate scheduler instances from passing the same due-run check at the same time.

Pipeline run steps come from the active or selected pipeline version config. Seeded or legacy versions without explicit `steps` fall back to source-type defaults.

## Observability

The backend emits structured JSON logs and returns `X-Request-ID` on HTTP responses. Requests with an incoming `X-Request-ID` keep that value; otherwise the middleware generates one. Prometheus-compatible metrics are exposed at `/metrics`.

## Tests

The backend tests cover:

- Authentication and authorization behavior
- Dataset and pipeline API workflows
- Run status transitions
- Alert rule and alert handling
- Demo content seeding
- Fake scheduler behavior
- Basic security expectations

Tests use PostgreSQL by default. Set `TEST_DATABASE_URL` to override the test database connection string.

Run all backend tests from this directory:

```bash
python -m pytest
```
