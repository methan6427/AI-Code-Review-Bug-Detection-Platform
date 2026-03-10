# Architecture Plan

## Product Scope

Phase 1 started as an end-to-end MVP for authenticated users to register, manage repositories, trigger scans, and review findings in a modern dashboard. The current implementation now includes Phase 2 foundations for GitHub App installation-backed repository access, webhook-triggered scans, worker-based execution, retry handling, and GitHub check reporting.

## System Design

### Frontend

- React + TypeScript + Vite
- Tailwind CSS for the design system layer
- React Router for route composition
- TanStack Query for API state and caching
- Local auth state backed by Supabase-style access tokens returned by the backend
- Supabase browser OAuth for GitHub provider redirects and callback session exchange

### Backend

- Express + TypeScript
- Modular `routes -> controllers -> services -> repositories` flow
- Supabase Auth used for signup/login and bearer-token validation
- PostgreSQL via Supabase tables for profiles, repositories, scans, and issues
- Rule-based scan engine behind service interfaces so a Python worker or LLM integration can be added later
- Dedicated scan worker process that polls queued jobs from the database
- GitHub App integration service for installation discovery, installation tokens, and GitHub check reporting

### Database

- `profiles` extends Supabase `auth.users`
- `repositories` belong to a user profile
- `scans` belong to a repository
- `issues` belong to a scan
- RLS policies allow direct Supabase use later even though the MVP primarily goes through the backend API

## Backend Module Boundaries

- `auth`: signup, login, logout, current user, auth middleware
- `github`: webhook verification and GitHub event intake
- `repositories`: CRUD-lite for repositories, installation linkage, and sample code assets
- `scans`: scan creation, retry lifecycle, scan detail retrieval, scan events, and GitHub reporting
- `issues`: issue listing with filtering
- `dashboard`: aggregate metrics and recent activity
- `analysis`: `ScanOrchestrator`, `StaticAnalysisService`, `AIAnalysisService`, scan rules

## Scan Flow

1. User creates a repository record with metadata, optional sample code blobs, and optional GitHub App installation linkage.
2. User triggers `POST /repositories/:id/scan` or GitHub sends a push/pull request webhook.
3. Backend creates a `queued` scan row with branch, commit, and source context.
4. The scan worker claims the queued job, increments the attempt counter, and records an execution event.
5. The worker loads repository content from:
   - GitHub App installation-token-backed git clone when available
   - fallback sample files stored on the repository record
6. The worker runs:
   - `StaticAnalysisService`
   - `AIAnalysisService` placeholder heuristics
7. Findings are persisted as issue rows.
8. The worker records scan events, schedules retries on transient failure, and marks the scan `completed` or `failed`.
9. For GitHub-backed commits, the worker publishes a GitHub check run summarizing the findings.

## Future-Ready Extension Points

- `GitHubIntegrationService`: OAuth, installation tokens, webhook verification, GitHub checks
- `RepositorySourceAdapter`: replace sample files with cloned repository snapshots
- `JobQueue`: database-backed worker today, BullMQ or equivalent later
- `PythonWorkerClient`: offload deep analysis or ML workloads
- `LLMAnalysisService`: replace placeholder implementation with model-backed analysis

## Deployment Shape

- Frontend deploys independently to Vercel
- Backend deploys as a Node service to Render, Railway, Fly.io, or similar
- Supabase provides Postgres, Auth, and optional storage
- Environment variables are isolated per app
