# Implementation Roadmap

## Phase 1 MVP

Status: complete

1. Completed monorepo foundations and shared types.
2. Completed Supabase schema, RLS, and auth profile sync trigger.
3. Completed backend auth, repository, dashboard, scan, and issue modules.
4. Completed MVP rule-based scan engine with extensible interfaces.
5. Completed frontend auth flow, protected routing, and dashboard shell.
6. Completed repository management, scan detail views, and issue filtering.
7. Completed frontend/backend integration with query caching and resilient UI states.
8. Completed setup, environment, deployment, and architecture documentation.

## Phase 2 Progress

### Completed

- GitHub OAuth sign-in through Supabase has been added.
- GitHub account-link awareness is exposed in the authenticated user flow.
- GitHub App install URL discovery and installation listing are implemented.
- Installation-backed repository import is wired into the repositories page.
- Signed GitHub webhook ingestion is implemented.
- Webhook-triggered repository scan creation is implemented for push and pull request events.
- Webhook scans now persist branch, commit, base commit, pull request, and changed-file context.
- Duplicate queued/running scan prevention is implemented in the backend.
- Repository scan actions in the UI reflect active queued/running state.
- Issue triage status actions are now implemented for `open`, `resolved`, and `ignored`.
- Scan execution now runs through a dedicated worker process instead of directly in the API request path.
- Scan execution now prefers real git-cloned repository contents over stored sample files when repository access is available.
- Branch-aware, commit-aware, and changed-file-aware scan context is now surfaced in scan details.
- GitHub App installation linkage is now persisted on imported repositories and used for installation-token-backed cloning.
- Scan jobs now support retry scheduling, attempt tracking, and execution-event logging.
- Completed and failed GitHub-backed scans can now publish GitHub check runs against the scanned commit.

### In Progress Foundations

- Pull request scans now report GitHub checks, but they do not yet publish inline PR review comments.
- The worker model has retries and event logging, but still uses database-backed polling rather than Redis/BullMQ.
- Installation-token usage is now implemented for cloning and reporting, but token lifecycle management is still request-scoped and not cached.

### Next Priority Work

1. Add inline pull request review comments for findings that can be mapped safely to diff hunks.
2. Harden installation-token lifecycle handling with caching/refresh behavior and tighter private-repo access safeguards.
3. Expand analysis depth with dependency vulnerability checks, stronger secret scanning, and richer issue metadata.
4. Add issue activity history, triage notes, assignees, and bulk review actions.
5. Add rate limiting, audit logging, automated tests, and CI coverage.
6. Replace the polling worker with a dedicated queue backend such as BullMQ when Redis infrastructure is introduced.
