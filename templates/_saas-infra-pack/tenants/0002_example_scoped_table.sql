-- Studio Zero — Example tenant-scoped table with RLS
-- Migration 0002 — example pattern. Replace with your real domain tables.
--
-- Pattern that every tenant-scoped table follows:
--   1. tenant_id uuid not null references tenants(id)
--   2. Index on tenant_id
--   3. RLS enabled
--   4. Policy: row visible iff user is member of tenant_id

create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  name        text not null,
  description text,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index projects_tenant_idx on public.projects (tenant_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.touch_updated_at();

alter table public.projects enable row level security;

-- A user can see / modify projects in tenants they belong to
create policy projects_select on public.projects for select
  using (tenant_id in (select tenant_id from public.memberships where user_id = auth.uid()));

create policy projects_insert on public.projects for insert
  with check (tenant_id in (select tenant_id from public.memberships where user_id = auth.uid()));

create policy projects_update on public.projects for update
  using (tenant_id in (
    select tenant_id from public.memberships
    where user_id = auth.uid() and role in ('owner','admin','member')
  ));

create policy projects_delete on public.projects for delete
  using (tenant_id in (
    select tenant_id from public.memberships
    where user_id = auth.uid() and role in ('owner','admin')
  ));
