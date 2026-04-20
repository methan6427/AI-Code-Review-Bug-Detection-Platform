alter table public.issues
add column if not exists triage_note text,
add column if not exists assigned_to uuid references public.profiles (id) on delete set null,
add column if not exists last_status_changed_at timestamptz,
add column if not exists last_status_changed_by uuid references public.profiles (id) on delete set null;

create index if not exists issues_assigned_to_idx on public.issues (assigned_to);
create index if not exists issues_status_idx on public.issues (status);

create table if not exists public.issue_activity (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (action in ('status_changed', 'assigned', 'unassigned', 'note_added', 'note_updated', 'note_cleared', 'created')),
  previous_value jsonb,
  next_value jsonb,
  note text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists issue_activity_issue_id_created_at_idx
on public.issue_activity (issue_id, created_at desc);

alter table public.issue_activity enable row level security;

create policy "Users can read own issue activity"
on public.issue_activity
for select
using (
  exists (
    select 1
    from public.issues issues
    join public.repositories repositories on repositories.id = issues.repository_id
    where issues.id = issue_id
      and repositories.user_id = auth.uid()
  )
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  actor_email text,
  action text not null,
  resource_type text not null,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_resource_idx on public.audit_logs (resource_type, resource_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;

create policy "Users can read own audit logs"
on public.audit_logs
for select
using (auth.uid() = actor_id);
