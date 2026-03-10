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

## Troubleshooting

- `Profile not found` after auth: Make sure the migration ran successfully, including the `handle_new_user` trigger.
- Signup fails: Verify `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are correct in `apps/backend/.env`.
- Frontend cannot reach backend: Confirm `VITE_API_URL` matches the backend origin and that `APP_ORIGIN` includes the frontend URL. Multiple origins can be supplied as a comma-separated list.
- Empty dashboard after setup: Run `npm run seed:demo --workspace backend` or create a repository manually and trigger a scan.
- Scans remain queued: Confirm `npm run dev:worker` is running in a separate terminal.
- Tests fail to start on Windows from a restricted shell: Run the workspace test command directly from the repo root or from each workspace directory using the provided npm scripts.
- GitHub check runs are missing: Verify the GitHub App has `Checks: Read and write` and `Contents: Read` permissions. If you changed app permissions, reinstall or re-authorize the app on the target repository/org so the installation token picks up the new scope.
- GitHub check runs still show `githubCheckRunId: null`: Check backend/worker logs for `Skipping GitHub check run`, `Attempting GitHub check run`, `GitHub installation access token request failed`, or `GitHub check run creation failed`. The log metadata now includes the installation id, repo, commit SHA, HTTP status, and GitHub error body.

## Vercel Deployment

- Root Directory: `.`
- Build Command: `npm run build:frontend`
- Output Directory: `apps/frontend/dist`

The frontend depends on the workspace package `@ai-review/shared`, so Vercel must install and build from the monorepo root. The `build:frontend` script builds `packages/shared` first, then builds the Vite frontend.

Required frontend environment variables in Vercel:

- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

This repo includes [`vercel.json`](./vercel.json) so React Router deep links are rewritten to `index.html` and the monorepo build/output settings stay consistent.

Important: this Vercel setup deploys the frontend app. The Express backend and worker are still separate runtime services and need to be hosted outside this static Vercel frontend build unless you separately convert the backend to Vercel serverless functions.

### Step-by-step deployment

1. Push this repository to GitHub.
2. Deploy or keep your backend running on a public URL, for example `https://your-api.example.com/api`.
3. In Supabase Auth settings, add your Vercel site URL and callback URL:
   - Site URL: `https://your-project.vercel.app`
   - Redirect URL: `https://your-project.vercel.app/auth/callback`
4. In your backend environment, add the Vercel frontend origin to `APP_ORIGIN`.
   Example: `APP_ORIGIN=http://localhost:5173,https://your-project.vercel.app`
5. In Vercel, click `Add New Project` and import this repository.
6. In the Vercel project settings, keep the project Root Directory as `.`
7. Set these Vercel environment variables:
   - `VITE_API_URL=https://your-api.example.com/api`
   - `VITE_SUPABASE_URL=https://your-project.supabase.co`
   - `VITE_SUPABASE_ANON_KEY=your-supabase-anon-key`
8. For the build settings, use:
   - Build Command: `npm run build:frontend`
   - Output Directory: `apps/frontend/dist`
9. Start the deployment.
10. After the first deploy finishes, open the Vercel URL and test:
   - `/auth`
   - `/auth/callback`
   - a deep link like `/dashboard`
11. Verify email/password auth, GitHub auth, and Google auth from the deployed frontend.
12. If OAuth redirects fail, re-check the Supabase redirect URLs and confirm the backend `APP_ORIGIN` includes the Vercel domain.

## Further Reading

- [ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [DATABASE_SCHEMA.md](./docs/DATABASE_SCHEMA.md)
- [ROADMAP.md](./docs/ROADMAP.md)
