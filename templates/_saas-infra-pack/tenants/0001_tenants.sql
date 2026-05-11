-- Studio Zero — Multi-tenant Foundation (Option A: single-DB, tenant_id-scoped, RLS)
-- Migration 0001 — tenants + memberships
--
-- Pattern: every tenant-scoped table has tenant_id NOT NULL and an RLS policy
-- restricting access to memberships of the requesting user.

create extension if not exists pgcrypto;

-- ---------- Tenants ----------
create table public.tenants (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  name        text not null,
  plan_tier   text not null default 'free' check (plan_tier in ('free','pro','enterprise')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Memberships ----------
-- A user can belong to multiple tenants with different roles per tenant.
create table public.memberships (
  user_id     uuid not null references auth.users(id) on delete cascade,
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','member','viewer')),
  created_at  timestamptz not null default now(),
  primary key (user_id, tenant_id)
);

create index memberships_tenant_idx on public.memberships (tenant_id);
create index memberships_user_idx on public.memberships (user_id);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger tenants_updated_at
  before update on public.tenants
  for each row execute function public.touch_updated_at();

-- ---------- RLS ----------
alter table public.tenants enable row level security;
alter table public.memberships enable row level security;

-- A user can see tenants they're a member of
create policy tenants_select on public.tenants for select
  using (id in (select tenant_id from public.memberships where user_id = auth.uid()));

-- Only owners/admins can update tenant settings
create policy tenants_update on public.tenants for update
  using (id in (
    select tenant_id from public.memberships
    where user_id = auth.uid() and role in ('owner','admin')
  ));

-- Memberships: a user can see their own memberships
create policy memberships_self_select on public.memberships for select
  using (user_id = auth.uid());

-- Memberships: tenant admins can see all memberships in their tenants
create policy memberships_admin_select on public.memberships for select
  using (tenant_id in (
    select tenant_id from public.memberships
    where user_id = auth.uid() and role in ('owner','admin')
  ));
