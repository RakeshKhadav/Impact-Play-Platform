-- Phase 5 PRD Closure
-- Adds draw-engine v2 primitives, participant evaluation rows, winner payout workflow fields,
-- charity tags for public filtering, and additive RLS updates.

do $$
begin
  create type public.draw_logic_mode as enum ('random', 'weighted');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.prize_tier as enum ('none', 'three_match', 'four_match', 'five_match');
exception
  when duplicate_object then null;
end;
$$;

do $$
begin
  create type public.winner_payment_status as enum ('pending', 'paid');
exception
  when duplicate_object then null;
end;
$$;

alter table public.charities
  add column if not exists tags text[] not null default '{}';

alter table public.draws
  add column if not exists engine_version smallint not null default 1,
  add column if not exists logic_mode public.draw_logic_mode not null default 'random',
  add column if not exists draw_numbers integer[],
  add column if not exists five_match_pool numeric(12,2) not null default 0 check (five_match_pool >= 0),
  add column if not exists four_match_pool numeric(12,2) not null default 0 check (four_match_pool >= 0),
  add column if not exists three_match_pool numeric(12,2) not null default 0 check (three_match_pool >= 0),
  add column if not exists five_match_rollover_in numeric(12,2) not null default 0 check (five_match_rollover_in >= 0),
  add column if not exists five_match_rollover_out numeric(12,2) not null default 0 check (five_match_rollover_out >= 0),
  add column if not exists active_subscriber_count_snapshot integer not null default 0 check (active_subscriber_count_snapshot >= 0),
  add column if not exists weighted_seed text,
  add column if not exists calculation_metadata jsonb not null default '{}'::jsonb;

create or replace function public.is_valid_score_set(input_values integer[], expected_size integer, require_unique boolean default false)
returns boolean
language sql
immutable
as $$
  select
    input_values is not null
    and cardinality(input_values) = expected_size
    and coalesce((select bool_and(item between 1 and 45) from unnest(input_values) as item), false)
    and (
      not require_unique
      or (select count(distinct item) = expected_size from unnest(input_values) as item)
    );
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'draws_draw_numbers_valid_chk'
      and conrelid = 'public.draws'::regclass
  ) then
    alter table public.draws
      add constraint draws_draw_numbers_valid_chk
      check (draw_numbers is null or public.is_valid_score_set(draw_numbers, 5, true));
  end if;
end;
$$;

create table if not exists public.draw_participants (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references public.draws(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  score_set integer[] not null,
  match_count integer not null default 0 check (match_count between 0 and 5),
  prize_tier public.prize_tier not null default 'none',
  prize_amount numeric(12,2) not null default 0 check (prize_amount >= 0),
  is_eligible boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(draw_id, user_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'draw_participants_score_set_valid_chk'
      and conrelid = 'public.draw_participants'::regclass
  ) then
    alter table public.draw_participants
      add constraint draw_participants_score_set_valid_chk
      check (public.is_valid_score_set(score_set, 5, false));
  end if;
end;
$$;

create index if not exists draw_participants_draw_idx on public.draw_participants(draw_id, created_at desc);
create index if not exists draw_participants_user_idx on public.draw_participants(user_id, created_at desc);
create index if not exists draw_participants_tier_idx on public.draw_participants(draw_id, prize_tier, prize_amount desc);

drop trigger if exists set_draw_participants_updated_at on public.draw_participants;
create trigger set_draw_participants_updated_at
before update on public.draw_participants
for each row execute function public.set_updated_at();

alter table public.winners
  add column if not exists participant_id uuid references public.draw_participants(id) on delete set null,
  add column if not exists match_count integer check (match_count between 0 and 5),
  add column if not exists prize_tier public.prize_tier not null default 'none',
  add column if not exists engine_version smallint not null default 1,
  add column if not exists verification_notes text,
  add column if not exists verification_reviewed_by uuid references auth.users(id) on delete set null,
  add column if not exists verification_reviewed_at timestamptz,
  add column if not exists payment_status public.winner_payment_status not null default 'pending',
  add column if not exists payment_reference text,
  add column if not exists payment_paid_at timestamptz,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.winners
  drop constraint if exists winners_draw_id_rank_key;

create index if not exists winners_payment_status_idx on public.winners(payment_status, created_at desc);
create index if not exists winners_verification_idx on public.winners(verification_status, created_at desc);
create index if not exists winners_participant_idx on public.winners(participant_id);

update public.winners
set
  payment_reference = coalesce(payment_reference, payout_reference),
  payment_paid_at = coalesce(payment_paid_at, payout_at),
  payment_status = case
    when coalesce(payment_paid_at, payout_at) is not null then 'paid'::public.winner_payment_status
    else 'pending'::public.winner_payment_status
  end,
  engine_version = coalesce(engine_version, 1);

-- Existing rows remain legacy/v1 compatible, while new rows default to engine_version 2.
alter table public.draws alter column engine_version set default 2;

alter table public.draw_participants enable row level security;

drop policy if exists draw_participants_select_self_or_admin on public.draw_participants;
create policy draw_participants_select_self_or_admin
on public.draw_participants
for select
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

drop policy if exists draw_participants_admin_full on public.draw_participants;
create policy draw_participants_admin_full
on public.draw_participants
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists winners_read_published_self_or_admin on public.winners;
drop policy if exists winners_read_self_or_admin on public.winners;
create policy winners_read_self_or_admin
on public.winners
for select
to authenticated
using (auth.uid() = user_id or public.is_admin(auth.uid()));

create or replace view public.published_draw_summaries as
select
  d.id,
  d.draw_month,
  d.title,
  d.published_at,
  d.logic_mode,
  d.draw_numbers,
  d.winner_pool,
  d.five_match_pool,
  d.four_match_pool,
  d.three_match_pool,
  d.five_match_rollover_in,
  d.five_match_rollover_out,
  d.eligible_count,
  d.active_subscriber_count_snapshot,
  coalesce((select count(*) from public.draw_participants dp where dp.draw_id = d.id and dp.prize_tier = 'five_match'), 0)::integer as five_match_winner_count,
  coalesce((select count(*) from public.draw_participants dp where dp.draw_id = d.id and dp.prize_tier = 'four_match'), 0)::integer as four_match_winner_count,
  coalesce((select count(*) from public.draw_participants dp where dp.draw_id = d.id and dp.prize_tier = 'three_match'), 0)::integer as three_match_winner_count
from public.draws d
where d.status = 'published';

grant select on public.published_draw_summaries to anon, authenticated;
