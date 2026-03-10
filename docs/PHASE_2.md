# Phase 2 Roadmap

This document captures the intentionally deferred work after the MVP.

The current project is already runnable and portfolio-ready. Phase 2 is about moving from a strong MVP to a more production-like platform.

## Current Progress

Started on March 9, 2026:

- Scan infrastructure hardening has begun with duplicate active-scan prevention on the backend.
- Repository scan actions now reflect active queued/running state in the UI instead of allowing repeated triggers.
- GitHub OAuth sign-in has been added through Supabase with a dedicated frontend callback route.
- GitHub account linking and signed webhook ingestion have been added as the next integration foundation.
- GitHub App installation discovery and installation-backed repository import are now wired into the product.
- Scan execution now runs through a dedicated worker process with queued job polling.
- Branch, commit, pull request, and changed-file scan context is now persisted and shown in scan details.
- Scan retries, execution-event logging, and GitHub check-run reporting are now implemented for GitHub-backed scans.
- GitHub App installation tokens are now used for repository cloning and GitHub check publication when repositories are linked to an installation.

## 1. GitHub Integration

- Add GitHub OAuth login and account linking.
- Add repository installation and permission flow.
- Replace manual repository metadata entry with GitHub-connected import.
- Add webhook ingestion for repository updates and pull request events.

## 2. Real Scan Infrastructure

- Move scan execution out of the API process into background workers.
- Introduce a queue-backed orchestration layer such as BullMQ or a similar worker system.
- Add retry policies, failure diagnostics, and scan job observability.
- Prevent duplicate scans for the same repository when one is already active.

## 3. Repository Processing

- Clone real repositories instead of scanning only stored sample files.
- Support branch-specific and commit-specific scan contexts.
- Add diff-aware scan logic for pull requests and incremental analysis.
- Add secure token handling for private repository access.

## 4. Analysis Depth

- Expand static analysis beyond placeholder heuristics.
- Add dependency vulnerability checks from real advisory sources.
- Add secret scanning with stronger detection rules.
- Add richer issue metadata, confidence scores, and grouping.
- Introduce LLM-backed explanation and remediation generation where appropriate.

## 5. Issue Workflow

- Add issue status update actions such as resolve and ignore.
- Persist issue activity history and triage notes.
- Add assignee, ownership, and repository/team-based filtering.
- Add bulk actions for issue review workflows.

## 6. Product and UX Polish

- Add pagination, sorting, and stronger table/list views for larger datasets.
- Add toast notifications and optimistic UI where it improves workflow speed.
- Add richer charts and historical trends for scans and issue severity.
- Improve empty states for first-time onboarding and guided setup.

## 7. Security and Hardening

- Add rate limiting on auth and scan-trigger endpoints.
- Add stricter CORS and production environment safeguards.
- Add audit logging for sensitive account and scan actions.
- Improve secret management and avoid exposing any nonessential operational detail.

## 8. Quality and Delivery

- Add unit tests for backend services and validation logic.
- Add integration tests for auth, repository, scan, and issue flows.
- Add frontend component/page tests for critical workflows.
- Add CI checks for typecheck, build, lint, and tests.
- Add deployment notes and production environment documentation.

## Why These Are Phase 2

These items were intentionally left out of the MVP because they add substantial infrastructure, integration, and operational complexity.

The MVP already demonstrates:

- authenticated end-to-end product flow
- clean monorepo structure
- repository CRUD
- scan orchestration
- issue reporting and filtering
- presentable UI and local setup

Phase 2 should build on that foundation without rewriting the current architecture.
