# Implementation Roadmap

## Phase 1 MVP

1. Create monorepo foundations and shared types.
2. Define Supabase schema, RLS, and auth profile sync trigger.
3. Build backend auth, repository, dashboard, scan, and issue modules.
4. Implement rule-based scan engine with extensible interfaces.
5. Build frontend auth flow, protected routing, and dashboard shell.
6. Add repository management, scan detail views, and issue filters.
7. Connect frontend to backend with query caching and resilient UI states.
8. Document setup, environment variables, deployment notes, and future work.

## Phase 2 Hooks Already Reserved

- GitHub OAuth and installation flow
- Webhook ingestion and PR-triggered scans
- Repository cloning and source adapters
- Background jobs with Redis/BullMQ
- Python worker integration
- LLM-backed issue enrichment
- Dependency and secret scanning with external tools

