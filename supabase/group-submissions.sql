-- Group submissions feature

-- 1) Add submission_mode to tasks (individual | group)
alter table if exists public.tasks
  add column if not exists submission_mode text not null default 'individual'
  check (submission_mode in ('individual','group'));

-- 2) Task-scoped groups (simple, per-task grouping)
create table if not exists public.task_groups (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  name text not null,
  owner_id uuid not null references public.users(id) on delete cascade,
  party_code text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_groups_task on public.task_groups(task_id);

-- 3) Members of a task group
create table if not exists public.task_group_members (
  task_group_id uuid not null references public.task_groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (task_group_id, user_id)
);

create index if not exists idx_tgm_user on public.task_group_members(user_id);

-- 4) Link submissions to a group (nullable for individual submissions)
alter table if exists public.submissions
  add column if not exists group_id uuid null references public.task_groups(id) on delete set null;

-- Suggested constraints (optional, add manually as needed):
-- - For group tasks you can enforce exactly one submission per group:
--   create unique index if not exists uniq_group_task_submission
--   on public.submissions(task_id, group_id)
--   where group_id is not null;

