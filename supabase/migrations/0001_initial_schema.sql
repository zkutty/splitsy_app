create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key,
  email text unique,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id),
  name text not null,
  destination text,
  trip_currency_code char(3) not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid references public.users(id) on delete set null,
  display_name text not null,
  email text,
  avatar_url text,
  joined_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists trip_members_trip_id_user_id_idx
  on public.trip_members (trip_id, user_id)
  where user_id is not null;

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  currency_code char(3) not null,
  trip_conversion_rate numeric(12, 6) not null check (trip_conversion_rate > 0),
  trip_amount numeric(12, 2) not null check (trip_amount > 0),
  category text not null,
  custom_category text,
  note text,
  paid_by_member_id uuid not null references public.trip_members(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expense_participants (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  member_id uuid not null references public.trip_members(id) on delete cascade,
  primary key (expense_id, member_id)
);

alter table public.users enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_participants enable row level security;

create policy "users_can_read_their_profile"
on public.users
for select
using (auth.uid() = id);

create policy "users_can_upsert_their_profile"
on public.users
for insert
with check (auth.uid() = id);

create policy "users_can_update_their_profile"
on public.users
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "users_manage_owned_or_joined_trips"
on public.trips
for all
using (
  owner_user_id = auth.uid()
  or exists (
    select 1
    from public.trip_members
    where trip_members.trip_id = trips.id
      and trip_members.user_id = auth.uid()
  )
)
with check (owner_user_id = auth.uid());

create policy "trip_members_can_read_memberships"
on public.trip_members
for select
using (
  exists (
    select 1
    from public.trips
    where trips.id = trip_members.trip_id
      and (
        trips.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.trip_members as tm
          where tm.trip_id = trip_members.trip_id
            and tm.user_id = auth.uid()
        )
      )
  )
);

create policy "trip_owners_manage_memberships"
on public.trip_members
for all
using (
  exists (
    select 1
    from public.trips
    where trips.id = trip_members.trip_id
      and trips.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trips
    where trips.id = trip_members.trip_id
      and trips.owner_user_id = auth.uid()
  )
);

create policy "trip_members_manage_expenses"
on public.expenses
for all
using (
  exists (
    select 1
    from public.trip_members
    where trip_members.trip_id = expenses.trip_id
      and trip_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.trip_members
    where trip_members.trip_id = expenses.trip_id
      and trip_members.user_id = auth.uid()
  )
);

create policy "trip_members_manage_expense_participants"
on public.expense_participants
for all
using (
  exists (
    select 1
    from public.expenses
    join public.trip_members on trip_members.trip_id = expenses.trip_id
    where expenses.id = expense_participants.expense_id
      and trip_members.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.expenses
    join public.trip_members on trip_members.trip_id = expenses.trip_id
    where expenses.id = expense_participants.expense_id
      and trip_members.user_id = auth.uid()
  )
);
