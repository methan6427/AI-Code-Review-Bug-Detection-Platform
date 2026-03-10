alter table public.scans
add column if not exists scan_context jsonb not null default '{}'::jsonb;

create index if not exists scans_status_created_at_idx
on public.scans (status, created_at);
