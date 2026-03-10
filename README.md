# AI Code Review & Bug Detection Platform

Monorepo MVP for authenticated repository management, manual scan orchestration, and issue reporting.

The app uses a React frontend, an Express backend, and Supabase for Auth + Postgres. Repositories are stored as metadata plus sample files, then a rule-based scan engine generates realistic findings and dashboard summaries.

## Why This Is A Strong CV Project

- full-stack TypeScript monorepo with shared contracts across frontend and backend
- authenticated product workflow instead of isolated demo screens
- realistic CRUD, scan orchestration, reporting, and seeded demo data
- clean separation between API modules, analysis services, and UI features
- explicit phase-2 seams for OAuth, background workers, repo cloning, and LLM enrichment

## MVP Status

This repo now supports the full local MVP flow:

- email/password signup, login, logout, and session validation
- GitHub sign-in via Supabase OAuth callback flow
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

Backend:

```bash
npm run dev:backend
```

Worker:

```bash
npm run dev:worker
```

Frontend:

```bash
npm run dev:frontend
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health: `http://localhost:4000/api/health`

The scan worker must be running for queued scans to move from `queued` to `running` and `completed`.

## Demo Seed

To create a demo user plus seeded repositories/scans/issues:

```bash
npm run seed:demo --workspace backend
```

The script is idempotent for the demo repositories. It prints the demo credentials when complete.

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
npm run dev:backend
npm run dev:worker
npm run dev:frontend
npm run seed:demo --workspace backend
```

## Architecture Snapshot

- `apps/backend/src/modules/*`: domain controllers, routes, schemas, and services
- `apps/backend/src/services/analysis/*`: rule-based and placeholder AI scan logic
- `apps/frontend/src/features/*`: reusable form/validation logic for UI flows
- `apps/frontend/src/components/*`: reusable UI and domain components
- `packages/shared/src/*`: shared enums, API contracts, and domain models

## Troubleshooting

- `Profile not found` after auth: Make sure the migration ran successfully, including the `handle_new_user` trigger.
- Signup fails: Verify `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are correct in `apps/backend/.env`.
- Frontend cannot reach backend: Confirm `VITE_API_URL` matches the backend origin and that `APP_ORIGIN` includes the frontend URL. Multiple origins can be supplied as a comma-separated list.
- Empty dashboard after setup: Run `npm run seed:demo --workspace backend` or create a repository manually and trigger a scan.
- GitHub check runs are missing: Verify the GitHub App has `Checks: Read and write` and `Contents: Read` permissions. If you changed app permissions, reinstall or re-authorize the app on the target repository/org so the installation token picks up the new scope.
- GitHub check runs still show `githubCheckRunId: null`: Check backend/worker logs for `Skipping GitHub check run`, `Attempting GitHub check run`, `GitHub installation access token request failed`, or `GitHub check run creation failed`. The log metadata now includes the installation id, repo, commit SHA, HTTP status, and GitHub error body.

## Further Reading

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)
- [ROADMAP.md](./docs/ROADMAP.md)
