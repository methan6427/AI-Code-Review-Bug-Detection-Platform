# Folder Structure

```text
.
|-- apps/
|   |-- backend/
|   |   |-- src/
|   |   |   |-- app.ts
|   |   |   |-- server.ts
|   |   |   |-- config/
|   |   |   |   `-- env.ts
|   |   |   |-- constants/
|   |   |   |   `-- demoFiles.ts
|   |   |   |-- middleware/
|   |   |   |   |-- errorHandler.ts
|   |   |   |   |-- requireAuth.ts
|   |   |   |   `-- securityHeaders.ts
|   |   |   |-- modules/
|   |   |   |   |-- auth/
|   |   |   |   |-- dashboard/
|   |   |   |   |-- issues/
|   |   |   |   |-- repositories/
|   |   |   |   `-- scans/
|   |   |   |-- scripts/
|   |   |   |   `-- seed-demo.ts
|   |   |   |-- services/
|   |   |   |   |-- analysis/
|   |   |   |   `-- supabase/
|   |   |   |-- types/
|   |   |   `-- utils/
|   |   |-- package.json
|   |   `-- tsconfig.json
|   `-- frontend/
|       |-- src/
|       |   |-- app/
|       |   |-- components/
|       |   |   `-- ui/
|       |   |-- features/
|       |   |   |-- auth/
|       |   |   `-- repositories/
|       |   |-- hooks/
|       |   |-- layouts/
|       |   |-- lib/
|       |   |-- pages/
|       |   |-- routes/
|       |   |-- styles/
|       |   `-- main.tsx
|       |-- package.json
|       |-- tsconfig.json
|       `-- vite.config.ts
|-- docs/
|   |-- ARCHITECTURE.md
|   |-- DATABASE_SCHEMA.md
|   |-- FOLDER_STRUCTURE.md
|   `-- ROADMAP.md
|-- packages/
|   `-- shared/
|       |-- src/
|       |   |-- api.ts
|       |   |-- enums.ts
|       |   |-- index.ts
|       |   `-- scan.ts
|       |-- package.json
|       `-- tsconfig.json
|-- supabase/
|   `-- migrations/
|       `-- 001_initial_schema.sql
|-- package.json
`-- tsconfig.base.json
```

## Notes

- Backend modules are grouped by API domain.
- Frontend `features/` holds page-specific form and validation logic that would otherwise be duplicated across pages.
- `packages/shared` contains the contracts used by both the frontend and backend.
