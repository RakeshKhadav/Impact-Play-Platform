-- Phase 1 Foundation Migration
-- Creates core schema, constraints, triggers, and RLS policies.

create extension if not exists pgcrypto;

create type public.profile_role as enum ('subscriber', 'admin');
create type public.subscription_plan_type as enum ('monthly', 'yearly');
create type public.subscription_status as enum ('active', 'cancelled', 'expired', 'past_due');
create type public.draw_status as enum ('draft', 'simulated', 'published');
create type public.winner_verification_status as enum ('pending', 'approved', 'rejected');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text not null,
  role public.profile_role not null default 'subscriber',
  charity_id uuid,
  charity_contribution_percentage numeric(5,2) not null default 10 check (
    charity_contribution_percentage >= 10 and charity_contribution_percentage <= 100
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_type public.subscription_plan_type not null,
  status public.subscription_status not null default 'expired',
  stripe_subscription_id text unique,
  stripe_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.golf_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  score integer not null check (score >= 1 and score <= 45),
  score_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.charities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  cover_image_url text,
  website_url text,
  featured boolean not null default false,
  total_raised numeric(12,2) not null default 0,
  upcoming_events jsonb,
  is_active boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_charity_fk
  foreign key (charity_id)
  references public.charities(id)
  on delete set null;

create index subscriptions_user_status_idx on public.subscriptions(user_id, status);
create index subscriptions_current_period_end_idx on public.subscriptions(current_period_end desc);
create index golf_scores_user_date_idx on public.golf_scores(user_id, score_date desc, created_at desc);
create index charities_featured_name_idx on public.charities(featured desc, name asc);
create index charities_public_idx on public.charities(is_active, is_published, featured desc, name asc);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

create trigger set_golf_scores_updated_at
before update on public.golf_scores
for each row execute function public.set_updated_at();

create trigger set_charities_updated_at
before update on public.charities
for each row execute function public.set_updated_at();

create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where profiles.id = uid
      and profiles.role = 'admin'
  );
$$;

grant execute on function public.is_admin(uuid) to anon, authenticated;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = case
      when excluded.full_name <> '' then excluded.full_name
      else public.profiles.full_name
    end,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

create or replace function public.enforce_latest_five_scores()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.golf_scores
  where user_id = new.user_id
    and id not in (
      select id
      from public.golf_scores
      where user_id = new.user_id
      order by score_date desc, created_at desc
      limit 5
    );

  return new;
end;
$$;

create trigger enforce_five_scores
after insert or update of score, score_date on public.golf_scores
for each row execute function public.enforce_latest_five_scores();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.golf_scores enable row level security;
alter table public.charities enable row level security;

create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()));

create policy profiles_insert_self_or_admin
on public.profiles
for insert
to authenticated
with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy profiles_update_self_or_admin
on public.profiles
for update
to authenticated
using (auth.uid() = id or public.is_admin(auth.uid()))
with check (auth.uid() = id or public.is_admin(auth.uid()));

create policy profiles_delete_admin_only
on public.profiles
for delete
to authenticated
using (public.is_admin(auth.uid()));

create policy subscriptions_read_self_or_admin
on public.subscriptions
for select
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy subscriptions_admin_write
on public.subscriptions
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy scores_read_self_or_admin
on public.golf_scores
for select
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy scores_insert_self_or_admin
on public.golf_scores
for insert
to authenticated
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy scores_update_self_or_admin
on public.golf_scores
for update
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()))
with check (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy scores_delete_self_or_admin
on public.golf_scores
for delete
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create policy charities_public_read
on public.charities
for select
to anon, authenticated
using (is_active = true and is_published = true);

create policy charities_admin_full
on public.charities
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
