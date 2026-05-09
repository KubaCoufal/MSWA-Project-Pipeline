# Pipeline Monitor Frontend

This directory contains the React frontend for the Big Data Pipeline Monitor course project. It provides the operator-facing dashboard, dataset and pipeline pages, run history, alert rule management, alert handling, and authentication UI.

## Stack

- React with TypeScript
- Vite for development and production builds
- React Router for page navigation
- TanStack Query for API data fetching and cache invalidation
- MUI for UI components and layout
- Vitest and Testing Library for unit/component tests
- Playwright for browser end-to-end tests
- Capacitor configuration for future mobile packaging

## Environment Variables

Copy `.env.example` to `.env` for local frontend development:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Available variables:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API base URL used by browser requests |
| `VITE_AUTH_MODE` | `demo` | Authentication mode: `demo` or `keycloak` |
| `VITE_KEYCLOAK_URL` | `http://localhost:8080` | Keycloak server URL for Keycloak mode |
| `VITE_KEYCLOAK_REALM` | `pipeline-monitor` | Keycloak realm name |
| `VITE_KEYCLOAK_CLIENT_ID` | `pipeline-monitor-web` | Public Keycloak client ID |

## Scripts

Install dependencies:

```bash
npm install
```

Run the local development server:

```bash
npm run dev
```

Run quality checks:

```bash
npm run lint
npm run test
npm run build
```

Run browser end-to-end tests against the Docker Compose stack:

```bash
npx playwright install chromium
npm run test:e2e
```

Preview a production build locally:

```bash
npm run build
npm run preview
```

## Authentication Modes

### Demo Mode

`VITE_AUTH_MODE=demo` is the default. The UI shows a user switcher for Admin, Operator, and Viewer. API requests include the selected user's `X-Demo-User-Id` header.

### Keycloak Mode

`VITE_AUTH_MODE=keycloak` enables Keycloak login through `keycloak-js`. In this mode, the frontend stores the bearer token and sends it to the backend through the `Authorization` header.

The easiest way to run Keycloak mode is from the repository root:

```powershell
./infra/keycloak/start-keycloak-mode.ps1
```

## Project Structure

```text
src/
|-- api/                    API client and shared TypeScript types
|-- app/                    Query client configuration
|-- auth/                   Demo and Keycloak auth handling
|-- components/             Shared layout, form, and common UI components
|-- pages/                  Route-level pages
|-- test/                   Vitest setup and component tests
|-- utils/                  Formatting and schedule helpers
|-- App.tsx                 Route definitions
`-- main.tsx                React application entry point
```

## Mobile Packaging

The frontend includes Capacitor configuration, but the generated native Android project is not committed by default.

Build and sync the web application:

```bash
npm run mobile:sync
```

Generate the Android project locally the first time mobile packaging is needed:

```bash
npx cap add android
```

Open the Android project:

```bash
npm run mobile:open:android
```
