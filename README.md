# Big Data Pipeline Monitor

Full-stack school project for simulated big data pipeline monitoring. The stack uses `FastAPI + SQLAlchemy + Alembic + RQ + Redis + Postgres` on the backend and `React + Vite + TypeScript + React Router + TanStack Query + MUI` on the frontend.

## What is included
- Metadata management for datasets, pipelines, alert rules, and alerts
- Simulated pipeline run lifecycle with a separate worker container
- Dashboard, list/detail pages, role-aware actions, and mobile-friendly responsive UI
- Demo auth boundary using seeded `admin`, `operator`, and `viewer` users, ready to be swapped for Keycloak later
- Docker Compose setup for `frontend`, `backend`, `worker`, `postgres`, and `redis`

## Demo users
- `Admin` (`X-Demo-User-Id: 1`): full metadata management and run control
- `Operator` (`X-Demo-User-Id: 2`): run control and monitoring
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
npm run test
npm run build
npm run dev
```

## Docker Compose
```bash
docker compose up --build
```

Services:
- Frontend: `http://localhost:4173`
- Backend API: `http://localhost:8000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`

## Smoke test
After the compose stack is running:

```bash
python infra/smoke_test.py
```

The script creates a dataset, pipeline, runtime alert rule, starts a run, waits for worker completion, and verifies that an alert is raised.

## Project layout
- [backend/app/main.py](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/backend/app/main.py)
- [frontend/src/App.tsx](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/frontend/src/App.tsx)
- [docker-compose.yml](/c:/Users/coufa/Documents/GitHub/MSWA-Project-Pipeline/docker-compose.yml)
