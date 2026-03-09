# Architecture Plan

## Product Scope

Phase 1 is an end-to-end MVP for authenticated users to register, manage repositories, trigger scans, and review findings in a modern dashboard. The MVP intentionally avoids real repository cloning and webhook processing, but it keeps those seams visible in the architecture.

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

### Database

- `profiles` extends Supabase `auth.users`
- `repositories` belong to a user profile
- `scans` belong to a repository
- `issues` belong to a scan
- RLS policies allow direct Supabase use later even though the MVP primarily goes through the backend API

## Backend Module Boundaries

- `auth`: signup, login, logout, current user, auth middleware
- `github`: webhook verification and GitHub event intake
- `repositories`: CRUD-lite for repositories and sample code assets
- `scans`: scan creation, status lifecycle, scan detail retrieval
- `issues`: issue listing with filtering
- `dashboard`: aggregate metrics and recent activity
- `analysis`: `ScanOrchestrator`, `StaticAnalysisService`, `AIAnalysisService`, scan rules

## Scan Flow

1. User creates a repository record with metadata and optional sample code blobs.
2. User triggers `POST /repositories/:id/scan`.
3. Backend creates a `queued` scan row.
4. `ScanOrchestrator` marks the scan `running`, loads repository sample files, and runs:
   - `StaticAnalysisService`
   - `AIAnalysisService` placeholder heuristics
5. Findings are persisted as issue rows.
6. Scan status is updated to `completed` or `failed`.

## Future-Ready Extension Points

- `GitHubIntegrationService`: OAuth, installation tokens, webhook verification
- `RepositorySourceAdapter`: replace sample files with cloned repository snapshots
- `JobQueue`: BullMQ or equivalent for background scans
- `PythonWorkerClient`: offload deep analysis or ML workloads
- `LLMAnalysisService`: replace placeholder implementation with model-backed analysis

## Deployment Shape

- Frontend deploys independently to Vercel
- Backend deploys as a Node service to Render, Railway, Fly.io, or similar
- Supabase provides Postgres, Auth, and optional storage
- Environment variables are isolated per app
