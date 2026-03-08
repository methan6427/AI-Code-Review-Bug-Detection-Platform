# Database Schema

## Design Notes

- `profiles` uses the same UUID as `auth.users.id` to avoid duplicate identity systems.
- `repositories` store manual repository metadata plus `sample_files` JSON for realistic MVP scans.
- `scans` keep a durable status history shape with `queued`, `running`, `completed`, and `failed`.
- `issues` are immutable findings linked to a specific scan so reports remain historically accurate.

## Tables

### `profiles`

- `id uuid primary key references auth.users(id)`
- `email text unique`
- `full_name text`
- `avatar_url text`
- `created_at timestamptz`
- `updated_at timestamptz`

### `repositories`

- `id uuid primary key`
- `user_id uuid not null references profiles(id)`
- `name text not null`
- `owner text not null`
- `branch text not null default 'main'`
- `github_url text not null`
- `access_token_hint text`
- `description text`
- `sample_files jsonb not null default '[]'::jsonb`
- `last_scan_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

### `scans`

- `id uuid primary key`
- `repository_id uuid not null references repositories(id)`
- `status scan_status not null`
- `triggered_by uuid not null references profiles(id)`
- `summary jsonb not null default '{}'::jsonb`
- `error_message text`
- `started_at timestamptz`
- `completed_at timestamptz`
- `created_at timestamptz`
- `updated_at timestamptz`

### `issues`

- `id uuid primary key`
- `scan_id uuid not null references scans(id)`
- `repository_id uuid not null references repositories(id)`
- `severity issue_severity not null`
- `category issue_category not null`
- `status issue_status not null default 'open'`
- `title text not null`
- `description text not null`
- `recommendation text not null`
- `file_path text`
- `line_number integer`
- `rule_code text`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz`

## Enums

- `scan_status`: `queued`, `running`, `completed`, `failed`
- `issue_severity`: `critical`, `high`, `medium`, `low`, `info`
- `issue_category`: `bug`, `security`, `performance`, `maintainability`
- `issue_status`: `open`, `resolved`, `ignored`

