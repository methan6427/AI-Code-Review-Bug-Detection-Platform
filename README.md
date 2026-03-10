# AI Code Review & Bug Detection Platform

Monorepo MVP for authenticated repository management, manual scan orchestration, and issue reporting.

The app uses a React frontend, an Express backend, and Supabase for Auth + Postgres. Repositories are stored as metadata plus sample files, then a rule-based scan engine generates realistic findings and dashboard summaries.


## MVP Status

This repo now supports the full local MVP flow:

- email/password signup, login, logout, and session validation
- GitHub sign-in via Supabase OAuth callback flow
- GitHub App installation discovery and installation repository import
- signed GitHub webhook ingestion for push and pull request events
- dashboard metrics with recent scans and severity/activity charts
- repository create, read, update, and delete
- scan triggering with queued/running/completed states through a dedicated worker process
- retryable scan jobs with attempt tracking and execution-event logging
- issue listing with backend filtering by severity, category, and status
- issue triage actions for open, resolved, and ignored statuses
- GitHub check-run reporting for GitHub App-backed scan commits
- demo seed script for a ready-to-click local environment

## Tech Stack

- `apps/frontend`: React 19, Vite, TypeScript, React Router, TanStack Query, Tailwind CSS
- `apps/backend`: Express, TypeScript, Supabase JS, Zod
- `packages/shared`: shared API contracts and domain types
- `supabase/migrations`: schema and auth/profile sync trigger
- Vitest, React Testing Library, jsdom, and Supertest for automated regression coverage
- basic security headers, request validation, and typed environment parsing

## Project Structure

```text
apps/
  backend/      Express API and scan orchestration
  frontend/     React dashboard
packages/
  shared/       Shared types and API contracts
supabase/
  migrations/   SQL schema
docs/           Architecture and schema notes
```

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project
- A Vercel account for the frontend
- A Fly.io account for the backend API
- Optional: an `ngrok` account for local OAuth/webhook testing
- Optional: a GitHub App if you want installation-backed repository import, webhook-triggered scans, and check-run reporting

## Quick Start

### Run the website locally

1. Install dependencies:

```bash
npm install
```

2. Create environment files:

- `apps/backend/.env`
- `apps/frontend/.env`

3. Apply the SQL migrations in [`supabase/migrations`](./supabase/migrations) to your Supabase project.

4. Start the backend API:

```bash
npm run dev:backend
```

5. Start the scan worker in a second terminal:

```bash
npm run dev:worker
```

6. Start the frontend website in a third terminal:

```bash
npm run dev:frontend
```

7. Open the website at `http://localhost:5173`.

Local defaults:

- Website: `http://localhost:5173`
- API: `http://localhost:4000`
- Health endpoint: `http://localhost:4000/api/health`

The worker must be running or scans will remain stuck in `queued`.

## Local Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment files

Create these files from the examples:

- `apps/backend/.env`
- `apps/frontend/.env`

Backend variables:

```env
NODE_ENV=development
PORT=4000
APP_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GITHUB_TOKEN=optional-github-token-for-imports
GITHUB_APP_ID=optional-github-app-id
GITHUB_APP_NAME=optional-github-app-name
GITHUB_APP_CLIENT_ID=optional-github-app-client-id
GITHUB_APP_CLIENT_SECRET=optional-github-app-client-secret
GITHUB_APP_PRIVATE_KEY=optional-github-app-private-key-with-\n
GITHUB_WEBHOOK_SECRET=optional-webhook-secret-for-github-events
SCAN_WORKER_POLL_INTERVAL_MS=3000
SCAN_MAX_ATTEMPTS=3
SCAN_RETRY_BASE_DELAY_MS=5000
DEMO_USER_EMAIL=demo@aireview.local
DEMO_USER_PASSWORD=DemoPass123!
DEMO_USER_FULL_NAME=Demo Analyst
```

Frontend variables:

```env
VITE_API_URL=http://localhost:4000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Apply the database schema

Run the SQL migrations in [`supabase/migrations`](./supabase/migrations) against your Supabase project.

This creates:

- auth-linked `profiles`
- `repositories`
- `scans`
- `issues`
- scan context persistence for branch/commit-aware scans
- scan retry state, GitHub check-run linkage, and scan event history
- the `handle_new_user` trigger for profile sync

### 4. Start the apps

Backend API:

```bash
npm run dev:backend
```

Scan worker:

```bash
npm run dev:worker
```

Frontend website:

```bash
npm run dev:frontend
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health: `http://localhost:4000/api/health`

The scan worker must be running for queued scans to move from `queued` to `running` and `completed`.

### 5. Optional: seed demo data

```bash
npm run seed:demo --workspace backend
```

This creates a demo user plus seeded repositories, scans, and issues for a ready-to-click local environment.

## Demo Seed

To create a demo user plus seeded repositories/scans/issues:

```bash
npm run seed:demo --workspace backend
```

The script is idempotent for the demo repositories. It prints the demo credentials when complete.

## Automated Tests

The repository now includes a monorepo automated test suite focused on high-value regression coverage instead of snapshots.

### Test stack

- shared contracts: Vitest
- backend: Vitest + Supertest
- frontend: Vitest + React Testing Library + jsdom + user-event
- reusable factories/mocks: shared domain fixtures, mocked Supabase query builder, mocked GitHub services, mocked auth/session helpers, and render utilities

### Covered areas

- shared enum/domain contract stability and scan-context shapes
- backend environment parsing and validation
- backend schema validation and mapper behavior
- auth route behavior and unauthorized handling
- repository service logic
- scan creation and duplicate active scan prevention
- scan claim lifecycle and queued to running transitions
- scan execution success, retry scheduling, failure exhaustion, and issue persistence
- scan event logging and GitHub check-run publication logic
- GitHub webhook signature verification and push/pull_request event intake
- GitHub App installation listing, installation repository listing, and check-run API mapping
- repository source loading fallback behavior
- dashboard summary aggregation
- issue filtering and triage status updates
- frontend auth page, GitHub OAuth start flow, and OAuth callback flow
- protected route behavior
- dashboard, repositories, repository details, scans, and scan details pages
- loading, empty, and error states on major pages
- issue triage actions and retry/timeline rendering
- frontend API client auth headers, query building, and 401 session clearing

### Run tests

Run the full suite:

```bash
npm test
```

Run one workspace only:

```bash
npm run test --workspace @ai-review/shared
npm run test --workspace backend
npm run test --workspace frontend
```

Coverage:

```bash
npm run test:coverage
```

Watch mode:

```bash
npm run test:watch
```

## Implementation Notes

- The frontend talks only to the backend API for MVP flows, except for the GitHub OAuth redirect/callback handled directly by the Supabase browser client.
- Shared request/response contracts live in `packages/shared`.
- Signup is handled server-side and returns an authenticated session immediately.
- Auth sessions are revalidated on app boot through `GET /api/auth/me`.
- Scan execution is now handled by a separate worker process that polls queued scan jobs from the database.
- Real Git-backed scans now prefer cloned repository contents and use branch/commit context when available, with fallback to stored sample files.
- GitHub App installation-linked repositories use installation access tokens for cloning and GitHub check reporting.
- Webhook-triggered scans now persist the webhook installation id in scan context so check reporting can still use installation-backed auth even if the repository record linkage is stale.
- Scan details now include execution timeline events for queue, source loading, analysis, retry, and reporting stages.
- Security basics included in this version: API input validation, bearer-token auth middleware, security headers, `x-powered-by` disabled, and typed environment validation.
- The test suite intentionally uses deterministic mocks for Supabase, GitHub, network boundaries, and worker-side orchestration to avoid flaky local runs.

## Main API Routes

Auth:

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

GitHub:

- `POST /api/github/webhooks`
- `GET /api/github/app/install-url`
- `GET /api/github/installations`
- `GET /api/github/installations/:installationId/repositories`

Dashboard:

- `GET /api/dashboard/summary`

Repositories:

- `GET /api/repositories`
- `POST /api/repositories`
- `GET /api/repositories/:id`
- `PATCH /api/repositories/:id`
- `DELETE /api/repositories/:id`
- `POST /api/repositories/:id/scan`

Scans and issues:

- `GET /api/scans`
- `GET /api/scans/:id`
- `GET /api/issues/scan/:id`
- `PATCH /api/issues/:id/status`

## Useful Commands

```bash
npm run build
npm run typecheck
npm test
npm run test:coverage
npm run dev:backend
npm run dev:worker
npm run dev:frontend
npm run seed:demo --workspace backend
```

Workspace-specific test commands:

```bash
npm run test --workspace @ai-review/shared
npm run test --workspace backend
npm run test --workspace frontend
```

## Architecture Snapshot

- `apps/backend/src/modules/*`: domain controllers, routes, schemas, and services
- `apps/backend/src/services/analysis/*`: rule-based and placeholder AI scan logic
- `apps/backend/tests/*`: backend unit and integration-style tests with mocked Supabase/GitHub boundaries
- `apps/frontend/src/features/*`: reusable form/validation logic for UI flows
- `apps/frontend/src/components/*`: reusable UI and domain components
- `apps/frontend/tests/*`: page, route, and API client behavior tests with React Testing Library
- `packages/shared/src/*`: shared enums, API contracts, and domain models
- `packages/shared/tests/*`: contract stability tests
- `tests/factories/*`: reusable cross-workspace domain fixtures

## Deployment Overview

Production is split across multiple services:

- Vercel: static frontend build from `apps/frontend/dist`
- Fly.io: Express backend API
- Supabase: Auth, OAuth providers, and Postgres
- GitHub App: installation-backed repository import, webhooks, and check runs
- Optional ngrok: public tunnel for local webhook and callback testing

The frontend always expects `VITE_API_URL` to include the `/api` suffix.

Examples:

- Local frontend API base: `http://localhost:4000/api`
- Production frontend API base: `https://ai-code-review-bug-detection-platform.fly.dev/api`

## Vercel Frontend Deployment

- Root Directory: `.`
- Build Command: `npm run build:frontend`
- Output Directory: `apps/frontend/dist`

This repo includes [`vercel.json`](./vercel.json) so React Router deep links are rewritten to `index.html`.

Required frontend environment variables in Vercel:

- `VITE_API_URL=https://ai-code-review-bug-detection-platform.fly.dev/api`
- `VITE_SUPABASE_URL=https://your-project.supabase.co`
- `VITE_SUPABASE_ANON_KEY=your-supabase-anon-key`

Important:

- `VITE_API_URL` must include `/api`
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed in Vercel frontend env
- If you connect Supabase through the Vercel integration UI, the public env prefix for this repo is `VITE_`

## Fly.io Backend Deployment

The backend is an Express server and should be deployed separately from the Vercel frontend.

Current backend runtime expectations:

- backend listens on `process.env.PORT`
- default backend port is `4000`
- Fly `internal_port` must match that backend port

This repo is configured for:

- Fly internal port: `4000`
- Docker exposed port: `4000`
- Backend `PORT=4000`

Required backend environment variables on Fly:

```env
NODE_ENV=production
PORT=4000
APP_ORIGIN=https://your-project.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
GITHUB_TOKEN=optional-github-token-for-imports
GITHUB_APP_ID=optional-github-app-id
GITHUB_APP_NAME=optional-github-app-name
GITHUB_APP_CLIENT_ID=optional-github-app-client-id
GITHUB_APP_CLIENT_SECRET=optional-github-app-client-secret
GITHUB_APP_PRIVATE_KEY=optional-github-app-private-key-with-\n
GITHUB_WEBHOOK_SECRET=optional-webhook-secret-for-github-events
SCAN_WORKER_POLL_INTERVAL_MS=3000
SCAN_MAX_ATTEMPTS=3
SCAN_RETRY_BASE_DELAY_MS=5000
```

If you have multiple frontend origins, `APP_ORIGIN` can be comma-separated:

```env
APP_ORIGIN=http://localhost:5173,https://your-project.vercel.app
```

## Supabase Setup

This app uses Supabase for:

- email/password auth
- Google OAuth
- GitHub OAuth
- profile sync via migrations and auth trigger
- backend database access

Frontend env:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend env:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Supabase Auth configuration should include:

- Site URL:
  `https://your-project.vercel.app`
- Redirect URLs:
  `https://your-project.vercel.app/auth/callback`
  `http://localhost:5173/auth/callback`

The frontend callback logic uses:

- `${window.location.origin}/auth/callback`

So the same code works locally and on Vercel as long as those redirect URLs exist in Supabase.

## GitHub App Setup

GitHub App support is separate from Supabase OAuth.

Use a GitHub App if you want:

- installation-backed repository discovery
- installation repository import
- signed webhook ingestion for push and pull request scans
- GitHub check-run reporting on scan completion

Recommended GitHub App permissions:

- `Contents: Read`
- `Metadata: Read`
- `Checks: Read and write`
- `Pull requests: Read`

Recommended webhook events:

- `push`
- `pull_request`
- `installation`
- `installation_repositories`

Backend env for GitHub App features:

- `GITHUB_APP_ID`
- `GITHUB_APP_NAME`
- `GITHUB_APP_CLIENT_ID`
- `GITHUB_APP_CLIENT_SECRET`
- `GITHUB_APP_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`

Backend routes used by the frontend and GitHub:

- `GET /api/github/app/install-url`
- `GET /api/github/installations`
- `GET /api/github/installations/:installationId/repositories`
- `POST /api/github/webhooks`

## Optional ngrok Local Testing

Use `ngrok` when you need a public URL for local development, especially for:

- GitHub App webhook delivery to your local backend
- testing Supabase OAuth callbacks against a public local frontend

Example local tunnels:

- frontend: `ngrok http 5173`
- backend: `ngrok http 4000`

Typical local callback/webhook mappings:

- Supabase local callback:
  `https://<frontend-ngrok>.ngrok-free.app/auth/callback`
- GitHub webhook target:
  `https://<backend-ngrok>.ngrok-free.app/api/github/webhooks`

If you use ngrok, add the public frontend origin to:

- Supabase Auth redirect URLs
- backend `APP_ORIGIN`

## End-to-End Production Checklist

1. Deploy backend to Fly.io.
2. Confirm Fly app serves `GET /api/health`.
3. Set Fly `PORT=4000`.
4. Set Fly `internal_port = 4000`.
5. Deploy frontend to Vercel from the monorepo root.
6. Set `VITE_API_URL=https://ai-code-review-bug-detection-platform.fly.dev/api`.
7. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel.
8. Add Vercel frontend origin to Fly `APP_ORIGIN`.
9. Add Vercel and localhost callback URLs in Supabase Auth settings.
10. If using GitHub App features, configure the GitHub App callback, permissions, installation, and webhook URL.
11. Verify these URLs in production:
    - `/auth`
    - `/auth/callback`
    - `/dashboard`
    - backend `/api/health`

## Troubleshooting

- `Profile not found` after auth: Make sure the migration ran successfully, including the `handle_new_user` trigger.
- Signup fails: Verify `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are correct in `apps/backend/.env`.
- Frontend cannot reach backend: Confirm `VITE_API_URL` matches the backend origin and includes `/api`. Also confirm `APP_ORIGIN` includes the frontend URL. Multiple origins can be supplied as a comma-separated list.
- Fly proxy shows `failed to connect to machine` or `could not find a good candidate`: Check Fly `internal_port` matches backend `PORT`, and confirm the backend process started successfully.
- Frontend hits `https://your-backend.fly.dev/github/installations` instead of `/api/github/installations`: Fix `VITE_API_URL` to include `/api`.
- OAuth callback reaches `/auth/callback` but fails to finish: Re-check Supabase redirect URLs and confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct.
- OAuth works but app bootstrap hangs on `/auth/me`: Check backend CORS `APP_ORIGIN`, backend availability, and the frontend `VITE_API_URL`.
- Dashboard summary times out: Check Fly backend logs for dashboard request timing and Supabase query timing.
- Empty dashboard after setup: Run `npm run seed:demo --workspace backend` or create a repository manually and trigger a scan.
- Scans remain queued: Confirm `npm run dev:worker` is running in a separate terminal.
- Tests fail to start on Windows from a restricted shell: Run the workspace test command directly from the repo root or from each workspace directory using the provided npm scripts.
- GitHub check runs are missing: Verify the GitHub App has `Checks: Read and write` and `Contents: Read` permissions. If you changed app permissions, reinstall or re-authorize the app on the target repository/org so the installation token picks up the new scope.
- GitHub check runs still show `githubCheckRunId: null`: Check backend/worker logs for `Skipping GitHub check run`, `Attempting GitHub check run`, `GitHub installation access token request failed`, or `GitHub check run creation failed`. The log metadata now includes the installation id, repo, commit SHA, HTTP status, and GitHub error body.

## Further Reading

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)
- [ROADMAP.md](./docs/ROADMAP.md)
