# Pipeline Monitor Backend

This directory contains the FastAPI backend for the Big Data Pipeline Monitor course project. It exposes the REST API, database models, migrations, role checks, seeded demo content, fake scheduler, and RQ worker task used to simulate pipeline execution.

## Stack

- FastAPI for the HTTP API
- Pydantic for request and response schemas
- SQLAlchemy for ORM models and queries
- Alembic for database migrations
- PostgreSQL for the Docker Compose environment
- SQLite fallback for local tests and simple standalone runs
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
| `/runs` | Run listing, detail access, and status updates |
| `/alert-rules` | Alert rule listing, creation, and detail access |
| `/alerts` | Alert listing, detail access, acknowledgement, and resolution |

The generated OpenAPI page at `/docs` is the source of truth for request and response schemas.

## Authentication and Roles

The backend supports two authentication modes:

- `AUTH_MODE=demo`: reads the `X-Demo-User-Id` request header and maps it to seeded demo users.
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
| `SIMULATION_RUNTIME_SECONDS` | `2` | Artificial run duration used by the worker |
| `DEFAULT_RECORDS_PROCESSED` | `1200` | Simulated successful-run record count |
| `CORS_ORIGINS` | local frontend URLs | Allowed browser origins |
| `SEED_DEMO_CONTENT` | `true` | Enables seeded demo datasets, pipelines, runs, and alerts |
| `AUTH_MODE` | `demo` | `demo` or `keycloak` |
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

The fake scheduler checks active pipelines with valid cron schedules and creates due runs. This is designed for demonstration and testing rather than production-grade orchestration.

## Tests

The backend tests cover:

- Authentication and authorization behavior
- Dataset and pipeline API workflows
- Run status transitions
- Alert rule and alert handling
- Demo content seeding
- Fake scheduler behavior
- Basic security expectations

Run all backend tests from this directory:

```bash
python -m pytest
```
