create extension if not exists "pgcrypto";

create type public.scan_status as enum ('queued', 'running', 'completed', 'failed');
create type public.issue_severity as enum ('critical', 'high', 'medium', 'low', 'info');
create type public.issue_category as enum ('bug', 'security', 'performance', 'maintainability');
create type public.issue_status as enum ('open', 'resolved', 'ignored');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.repositories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  owner text not null,
  branch text not null default 'main',
  github_url text not null,
  access_token_hint text,
  description text,
  sample_files jsonb not null default '[]'::jsonb,
  last_scan_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint repositories_name_owner_unique unique (user_id, owner, name)
);

create table if not exists public.scans (
  id uuid primary key default gen_random_uuid(),
  repository_id uuid not null references public.repositories (id) on delete cascade,
  triggered_by uuid not null references public.profiles (id) on delete cascade,
  status public.scan_status not null default 'queued',
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  repository_id uuid not null references public.repositories (id) on delete cascade,
  severity public.issue_severity not null,
  category public.issue_category not null,
  status public.issue_status not null default 'open',
  title text not null,
  description text not null,
  recommendation text not null,
  file_path text,
  line_number integer,
  rule_code text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists repositories_user_id_idx on public.repositories (user_id);
create index if not exists scans_repository_id_idx on public.scans (repository_id);
create index if not exists scans_triggered_by_idx on public.scans (triggered_by);
create index if not exists issues_scan_id_idx on public.issues (scan_id);
create index if not exists issues_repository_id_idx on public.issues (repository_id);
create index if not exists issues_severity_idx on public.issues (severity);
create index if not exists issues_category_idx on public.issues (category);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

create trigger repositories_set_updated_at
before update on public.repositories
for each row execute procedure public.set_updated_at();

create trigger scans_set_updated_at
before update on public.scans
for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    avatar_url = excluded.avatar_url,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.repositories enable row level security;
alter table public.scans enable row level security;
alter table public.issues enable row level security;

create policy "Users can read own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles
for update
using (auth.uid() = id);

create policy "Users can insert own repositories"
on public.repositories
for insert
with check (auth.uid() = user_id);

create policy "Users can read own repositories"
on public.repositories
for select
using (auth.uid() = user_id);

create policy "Users can update own repositories"
on public.repositories
for update
using (auth.uid() = user_id);

create policy "Users can read own scans"
on public.scans
for select
using (
  exists (
    select 1
    from public.repositories repositories
    where repositories.id = repository_id
      and repositories.user_id = auth.uid()
  )
);

create policy "Users can insert own scans"
on public.scans
for insert
with check (
  auth.uid() = triggered_by
  and exists (
    select 1
    from public.repositories repositories
    where repositories.id = repository_id
      and repositories.user_id = auth.uid()
  )
);

create policy "Users can read own issues"
on public.issues
for select
using (
  exists (
    select 1
    from public.repositories repositories
    where repositories.id = repository_id
      and repositories.user_id = auth.uid()
  )
);
