-- Archive feature: add is_archived and archived_at to key tables
alter table if exists public.sessions
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz null;

alter table if exists public.workshops
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz null;

alter table if exists public.tasks
  add column if not exists is_archived boolean not null default false,
  add column if not exists archived_at timestamptz null;

