-- Phase 3 Draw Engine Foundation
-- Adds draw management, winner records, and admin-only simulation/publish workflow tables.

create table if not exists public.draws (
  id uuid primary key default gen_random_uuid(),
  draw_month date not null unique,
  title text not null,
  status public.draw_status not null default 'draft',
  entry_cutoff_at timestamptz not null,
  simulated_at timestamptz,
  published_at timestamptz,
  gross_pool numeric(12,2) not null default 0 check (gross_pool >= 0),
  operations_pool numeric(12,2) not null default 0 check (operations_pool >= 0),
  charity_pool numeric(12,2) not null default 0 check (charity_pool >= 0),
  winner_pool numeric(12,2) not null default 0 check (winner_pool >= 0),
  rollover_from_previous numeric(12,2) not null default 0 check (rollover_from_previous >= 0),
  rollover_to_next numeric(12,2) not null default 0 check (rollover_to_next >= 0),
  eligible_count integer not null default 0 check (eligible_count >= 0),
  simulated_winner_user_id uuid references auth.users(id) on delete set null,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  rank integer not null check (rank >= 1),
  prize_amount numeric(12,2) not null default 0 check (prize_amount >= 0),
  charity_id uuid references public.charities(id) on delete set null,
  verification_status public.winner_verification_status not null default 'pending',
  proof_url text,
  payout_reference text,
  payout_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(draw_id, rank),
  unique(draw_id, user_id)
);

create index if not exists draws_status_month_idx on public.draws(status, draw_month desc);
create index if not exists draws_published_at_idx on public.draws(published_at desc);
create index if not exists winners_draw_rank_idx on public.winners(draw_id, rank);
create index if not exists winners_user_created_idx on public.winners(user_id, created_at desc);

create trigger set_draws_updated_at
before update on public.draws
for each row execute function public.set_updated_at();

create trigger set_winners_updated_at
before update on public.winners
for each row execute function public.set_updated_at();

alter table public.draws enable row level security;
alter table public.winners enable row level security;

create policy draws_public_read_published
on public.draws
for select
to anon, authenticated
using (status = 'published');

create policy draws_admin_full
on public.draws
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy winners_read_published_self_or_admin
on public.winners
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.draws
    where draws.id = winners.draw_id
      and draws.status = 'published'
  )
  or auth.uid() = user_id
  or public.is_admin(auth.uid())
);

create policy winners_admin_full
on public.winners
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));
