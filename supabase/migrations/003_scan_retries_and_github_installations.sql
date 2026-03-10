alter table public.repositories
add column if not exists github_installation_id bigint,
add column if not exists github_repository_id bigint;

alter table public.scans
add column if not exists attempt_count integer not null default 0,
add column if not exists max_attempts integer not null default 3,
add column if not exists next_retry_at timestamptz,
add column if not exists last_error_at timestamptz,
add column if not exists last_error_details jsonb not null default '{}'::jsonb,
add column if not exists github_check_run_id bigint;

create table if not exists public.scan_events (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  level text not null check (level in ('info', 'warn', 'error')),
  stage text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists repositories_github_installation_id_idx
on public.repositories (github_installation_id);

create index if not exists scans_retry_schedule_idx
on public.scans (status, next_retry_at, created_at);

create index if not exists scan_events_scan_id_created_at_idx
on public.scan_events (scan_id, created_at);

alter table public.scan_events enable row level security;

create policy "Users can read own scan events"
on public.scan_events
for select
using (
  exists (
    select 1
    from public.scans scans
    join public.repositories repositories on repositories.id = scans.repository_id
    where scans.id = scan_id
      and repositories.user_id = auth.uid()
  )
);
