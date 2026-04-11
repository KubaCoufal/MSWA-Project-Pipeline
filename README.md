# Big Data Pipeline Monitor

Full-stack school project for simulated big data pipeline monitoring. The stack uses `FastAPI + SQLAlchemy + Alembic + RQ + Redis + Postgres` on the backend and `React + Vite + TypeScript + React Router + TanStack Query + MUI` on the frontend.

## What is included
- Metadata management for datasets, pipelines, alert rules, and alerts
- Simulated pipeline run lifecycle with a separate worker container
- Dashboard, list/detail pages, quick alert handling, pipeline edit controls, and mobile-friendly responsive UI
- Demo auth boundary with an optional Keycloak mode behind the same frontend/backend auth contract
- Docker Compose setup for `frontend`, `backend`, `worker`, `postgres`, `redis`, and optional `keycloak`
- Unit, integration, smoke, and browser end-to-end test coverage

## Demo users
- `Admin` (`X-Demo-User-Id: 1`): full metadata management and run control
- `Operator` (`X-Demo-User-Id: 2`): run control and alert handling
- `Viewer` (`X-Demo-User-Id: 3`): read-only access

## Local development
### Backend
```bash
cd backend
python -m pip install -e .[dev]
python -m pytest
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run lint
npm run test
npm run build
npm run dev
```

## Docker Compose
### Default demo mode
```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:4173`
- Backend API: `http://localhost:8000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

### Keycloak mode
PowerShell helper:
```powershell
./infra/keycloak/start-keycloak-mode.ps1
```

Manual command:
```powershell
$env:AUTH_MODE="keycloak"
$env:VITE_AUTH_MODE="keycloak"
docker compose --profile keycloak up --build -d
```

Default imported Keycloak realm settings:
- Realm: `pipeline-monitor`
- Client: `pipeline-monitor-web`
- Admin console: `http://localhost:8080`
- Keycloak bootstrap admin: `admin / admin`
- Demo realm users:
  - `admin / admin123`
  - `operator / operator123`
  - `viewer / viewer123`

The frontend picks its auth mode from `VITE_AUTH_MODE`, while the backend uses `AUTH_MODE`. Demo mode stays the default.
In Keycloak mode, the frontend uses `login-required`, and every application API route requires a bearer token. Only `/health` stays public so Docker health checks keep working.

## Persisting Keycloak users and roles
This repo now supports two layers of persistence for Keycloak:

1. Local Docker persistence:
- Keycloak stores its current state in the named volume `keycloak_data`
- UI-created users, groups, and roles survive container restarts

2. Git-managed realm persistence:
- The import/export file is [infra/keycloak/pipeline-monitor-realm.json](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/infra/keycloak/pipeline-monitor-realm.json)
- Commit this file if you want teammates to get the same users, roles, and groups

If you create users in the Keycloak UI and want to persist them back into git, run:

```powershell
./infra/keycloak/export-realm.ps1
```

That exports the current realm, including users, back into `infra/keycloak/pipeline-monitor-realm.json`.

## Testing
### Backend and frontend suites
```bash
cd backend
python -m pytest

cd ../frontend
npm run lint
npm run test
npm run build
```

### API smoke test
After the compose stack is running:

```bash
python infra/smoke_test.py
```

The script creates a dataset, pipeline, runtime alert rule, starts a run, waits for worker completion, and verifies that an alert is raised.

### Browser end-to-end test
With the compose stack running in demo mode:

```bash
cd frontend
npx playwright install chromium
npm run test:e2e
```

The Playwright flow creates a dataset, pipeline, alert rule, starts a run, and acknowledges the resulting alert from the UI.

## Mobile packaging
The frontend is configured for Capacitor-based packaging later. The repo includes:
- `frontend/capacitor.config.ts`
- `frontend/.env.example`
- npm scripts for `mobile:copy`, `mobile:sync`, and `mobile:open:android`

Typical next step:

```bash
cd frontend
npm install
npm run mobile:sync
```

If you want a full Android project generated locally, run `npx cap add android` once on your machine.

## Continuous integration
GitHub Actions CI is defined in [.github/workflows/ci.yml](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/.github/workflows/ci.yml). It runs:
- backend tests
- frontend lint, tests, and production build
- Docker Compose smoke test
- Playwright browser end-to-end test

## Project layout
- [backend/app/main.py](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/backend/app/main.py)
- [backend/app/core/security.py](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/backend/app/core/security.py)
- [frontend/src/App.tsx](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/frontend/src/App.tsx)
- [frontend/src/auth/AuthContext.tsx](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/frontend/src/auth/AuthContext.tsx)
- [frontend/playwright.config.ts](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/frontend/playwright.config.ts)
- [frontend/capacitor.config.ts](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/frontend/capacitor.config.ts)
- [infra/keycloak/pipeline-monitor-realm.json](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/infra/keycloak/pipeline-monitor-realm.json)
- [docker-compose.yml](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/docker-compose.yml)
