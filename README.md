# Big Data Pipeline Monitor

Big Data Pipeline Monitor is a full-stack course project for observing simulated data pipeline activity. It provides dataset and pipeline metadata management, run simulation, alert rules, alert handling, role-based access control, and a dashboard for operational status.

The project is intentionally self-contained so it can be evaluated locally with Docker Compose. The default mode starts the application with seeded demo data and demo users; an optional Keycloak profile demonstrates external identity-provider integration.

## Features

- Dashboard summary for pipeline health, recent runs, open alerts, and throughput.
- Management workflows for datasets, pipelines, alert rules, and alert events.
- Simulated or Kaggle-backed pipeline execution using a separate worker process and Redis queue.
- Cron-based schedule metadata with a fake scheduler for demo activity.
- Role-based permissions for admin, operator, and viewer workflows.
- Optional Keycloak authentication mode using the same frontend/backend auth contract.
- Automated backend, frontend, smoke, and browser end-to-end test coverage.
- Docker Compose orchestration for the complete stack.

## Architecture

| Area | Technology |
| --- | --- |
| Frontend | React, Vite, TypeScript, React Router, TanStack Query, MUI |
| Backend API | FastAPI, Pydantic, SQLAlchemy |
| API traffic | Nginx load balancer in front of horizontally scalable FastAPI containers |
| Database | PostgreSQL in Docker, SQLite fallback for local tests |
| Migrations | Alembic |
| Background work | Redis Queue (RQ) with Redis and horizontally scalable worker containers |
| Authentication | Demo header auth by default, optional Keycloak |
| Testing | Pytest, Vitest, Playwright, API smoke test |
| Packaging | Docker, Docker Compose, Capacitor-ready frontend |

The local Docker architecture separates request handling from pipeline execution:

```text
Browser / Frontend
        |
        v
Nginx backend load balancer :8000
        |
        v
FastAPI backend replicas
        |
        +---- PostgreSQL for persistent metadata and run history
        |
        +---- Redis/RQ queue for asynchronous pipeline jobs
                    |
                    v
              Worker replicas

Singleton services:
  backend-migrate runs Alembic migrations and demo seeding once
  scheduler creates due scheduled runs once per polling interval
```

The load balancer distributes HTTP API requests across backend replicas. Pipeline jobs are not executed by the load balancer or directly inside long-running HTTP requests. Instead, the backend creates a run record, enqueues a job in Redis, and one available worker claims the job. This makes API scaling and pipeline execution scaling independent.

## Quick Start

Prerequisites:

- Docker Desktop with Docker Compose
- Python 3.12 or newer for local backend development and smoke tests
- Node.js 22 or newer for local frontend development

Start the full demo stack:

```bash
docker compose up --build
```

Start the same stack with multiple backend API replicas and multiple worker replicas:

```bash
docker compose up --build --scale backend=2 --scale worker=3
```

In the scaled setup, `backend-migrate` performs database migrations and demo seeding once before the API starts. The `scheduler` service is also a singleton, so scheduled runs are not duplicated by every backend replica.

Default service URLs:

- Frontend: `http://localhost:4173`
- Backend API through the load balancer: `http://localhost:8000`
- Backend OpenAPI docs: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

The default Docker setup uses demo authentication and automatically seeds sample datasets, pipelines, runs, alert rules, alerts, and users.

To enable Kaggle EDA pipelines, create a root `.env` file next to `docker-compose.yml` with backend-only Kaggle credentials:

```env
KAGGLE_USERNAME=your-kaggle-username
KAGGLE_KEY=your-kaggle-api-key
KAGGLE_MAX_DOWNLOAD_MB=50
```

Kaggle pipelines can analyze a specific Kaggle dataset URL/slug or request the latest published CSV dataset within the configured size limit. Simulated pipelines remain available for demos without Kaggle credentials.

## Demo Accounts

In demo mode, the frontend allows switching between these users. API requests identify the selected user through the `X-Demo-User-Id` header.

| User | Header value | Role | Permissions |
| --- | --- | --- | --- |
| Admin | `X-Demo-User-Id: 1` | `admin` | Full metadata management, run control, and alert handling |
| Operator | `X-Demo-User-Id: 2` | `operator` | Start/update runs and handle alerts |
| Viewer | `X-Demo-User-Id: 3` | `viewer` | Read-only access |

## Suggested Demo Flow

This flow shows the main project behavior in a few minutes:

1. Open `http://localhost:4173`.
2. Review the dashboard summary, recent runs, and active alerts.
3. Switch between Admin, Operator, and Viewer to demonstrate role-based UI behavior.
4. As Admin, create a dataset and pipeline.
5. Create an alert rule for the new pipeline.
6. Start a pipeline run and wait for the worker to complete it.
7. Open the generated alert and acknowledge or resolve it.
8. Visit `http://localhost:8000/docs` to inspect the backend API contract.

## Local Development

Backend:

```bash
cd backend
python -m pip install -e .[dev]
python -m pytest
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run lint
npm run test
npm run build
npm run dev
```

For service-specific setup, scripts, and environment variables, see [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md).

## Keycloak Mode

The project includes an optional Keycloak profile for testing bearer-token authentication.

PowerShell helper:

```powershell
./infra/keycloak/start-keycloak-mode.ps1
```

Manual command:

```powershell
$env:AUTH_MODE="keycloak"
docker compose --profile keycloak up --build -d
```

Default imported Keycloak settings:

- Realm: `pipeline-monitor`
- Client: `pipeline-monitor-web`
- Admin console: `http://localhost:8080`
- Keycloak bootstrap admin: `admin / admin`
- Demo realm users:
  - `admin / admin123`
  - `operator / operator123`
  - `viewer / viewer123`
  - `user01 / user01123`

In Keycloak mode, all application API routes require a bearer token. The `/health` endpoint remains public for Docker health checks.

### Persisting Keycloak Changes

Keycloak state is persisted in two ways:

- Docker volume `keycloak_data` keeps UI-created users, roles, and groups across local restarts.
- [infra/keycloak/pipeline-monitor-realm.json](infra/keycloak/pipeline-monitor-realm.json) stores the Git-managed realm import/export.

After changing users or roles in the Keycloak UI, export the realm back into the repository:

```powershell
./infra/keycloak/export-realm.ps1
```

## Schedule Simulation

Pipeline schedules use standard cron expressions:

- `0 2 * * *` means every day at `02:00` UTC.
- `30 3 * * *` means every day at `03:30` UTC.
- `0 */6 * * *` means every 6 hours.
- `*/15 * * * *` means every 15 minutes.

The scheduler is intentionally simulated. It checks active pipelines with schedules, creates any missing due run, and sends it to the worker queue. It is designed for project demonstration rather than production orchestration.

## Testing

Backend and frontend checks:

```bash
cd backend
python -m pytest

cd ../frontend
npm run lint
npm run test
npm run build
```

API smoke test, after the Docker stack is running:

```bash
python infra/smoke_test.py
```

The smoke test creates a dataset, pipeline, runtime alert rule, starts a run, waits for worker completion, and verifies that an alert is raised.

Browser end-to-end test, after the Docker stack is running in demo mode:

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

The Playwright flow creates a dataset, pipeline, and alert rule, starts a run, and acknowledges the resulting alert through the UI.

## Continuous Integration

GitHub Actions CI is defined in [.github/workflows/ci.yml](.github/workflows/ci.yml). It runs:

- Backend Pytest suite
- Frontend lint, unit tests, and production build
- Docker Compose smoke test
- Playwright browser end-to-end test

## Mobile Packaging

The frontend is configured for future Capacitor packaging. Included files and scripts:

- [frontend/capacitor.config.ts](frontend/capacitor.config.ts)
- [frontend/.env.example](frontend/.env.example)
- `npm run mobile:copy`
- `npm run mobile:sync`
- `npm run mobile:open:android`

To sync the web build into a Capacitor project:

```bash
cd frontend
npm install
npm run mobile:sync
```

To generate a local Android project for the first time:

```bash
npx cap add android
```

## Repository Layout

```text
.
|-- backend/                 FastAPI application, models, migrations, tests
|-- frontend/                React/Vite application, UI tests, Playwright tests
|-- infra/                   Smoke test and Keycloak helper scripts
|-- .github/workflows/       Continuous integration workflow
|-- docker-compose.yml       Full local application stack
`-- README.md                Project overview and evaluation guide
```

Important entry points:

- [backend/app/main.py](backend/app/main.py)
- [backend/README.md](backend/README.md)
- [backend/app/core/security.py](backend/app/core/security.py)
- [frontend/README.md](frontend/README.md)
- [frontend/src/App.tsx](frontend/src/App.tsx)
- [frontend/src/auth/AuthContext.tsx](frontend/src/auth/AuthContext.tsx)
- [frontend/playwright.config.ts](frontend/playwright.config.ts)
- [docker-compose.yml](docker-compose.yml)

## Project Scope

This project simulates a monitoring environment. Pipeline runs, schedules, and alert generation are implemented to demonstrate monitoring workflows, queue processing, API design, role-based access, and frontend state management. It does not connect to a real external big data platform.
