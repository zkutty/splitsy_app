alter table public.trips
  add column if not exists status text,
  add column if not exists completed_at timestamptz,
  add column if not exists completed_by_user_id uuid references public.users(id),
  add column if not exists settled_at timestamptz;

update public.trips
set status = coalesce(
  status,
  case
    when settled_at is not null then 'settled'
    when completed_at is not null then 'completed'
    else 'active'
  end
);

alter table public.trips
  alter column status set default 'active';

alter table public.trips
  alter column status set not null;

alter table public.trips
  drop constraint if exists trips_status_check;

alter table public.trips
  add constraint trips_status_check
  check (status in ('active', 'completed', 'settled'));

create index if not exists trips_status_idx
  on public.trips (status);

create table if not exists public.trip_settlement_transfers (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_member_id uuid not null references public.trip_members(id) on delete restrict,
  to_member_id uuid not null references public.trip_members(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency_code char(3) not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'confirmed')),
  paid_marked_at timestamptz,
  paid_marked_by_user_id uuid references public.users(id),
  confirmed_at timestamptz,
  confirmed_by_user_id uuid references public.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists trip_settlement_transfers_trip_id_idx
  on public.trip_settlement_transfers (trip_id);

create index if not exists trip_settlement_transfers_trip_id_status_idx
  on public.trip_settlement_transfers (trip_id, status);

create or replace function public.is_trip_active(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips
    where id = target_trip_id
      and status = 'active'
  );
$$;

create or replace function public.is_expense_trip_active(target_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expenses
    join public.trips on trips.id = expenses.trip_id
    where expenses.id = target_expense_id
      and trips.status = 'active'
  );
$$;

create or replace function public.can_mark_settlement_transfer_paid(target_transfer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_settlement_transfers
    join public.trip_members on trip_members.id = trip_settlement_transfers.from_member_id
    where trip_settlement_transfers.id = target_transfer_id
      and trip_members.user_id = auth.uid()
  );
$$;

create or replace function public.can_confirm_settlement_transfer_received(target_transfer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_settlement_transfers
    join public.trip_members on trip_members.id = trip_settlement_transfers.to_member_id
    where trip_settlement_transfers.id = target_transfer_id
      and trip_members.user_id = auth.uid()
  );
$$;

create or replace function public.complete_trip(target_trip_id uuid, settlement_transfers jsonb default '[]'::jsonb)
returns public.trips
language plpgsql
security definer
set search_path = public
as $$
declare
  transfer_record jsonb;
  transfer_amount numeric(12, 2);
  transfer_currency char(3);
  completed_trip public.trips;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to complete a trip.';
  end if;

  if not public.is_trip_creator(target_trip_id) then
    raise exception 'Only the trip creator can complete this trip.';
  end if;

  if not public.is_trip_active(target_trip_id) then
    raise exception 'This trip has already been completed.';
  end if;

  if settlement_transfers is null or jsonb_typeof(settlement_transfers) <> 'array' then
    raise exception 'Settlement transfers must be a JSON array.';
  end if;

  delete from public.trip_settlement_transfers
  where trip_id = target_trip_id;

  for transfer_record in
    select value
    from jsonb_array_elements(settlement_transfers)
  loop
    transfer_amount := round((transfer_record ->> 'amount')::numeric, 2);
    transfer_currency := upper(transfer_record ->> 'currencyCode');

    if transfer_amount is null or transfer_amount <= 0 then
      raise exception 'Settlement transfer amounts must be greater than zero.';
    end if;

    if coalesce(transfer_record ->> 'fromMemberId', '') = '' or coalesce(transfer_record ->> 'toMemberId', '') = '' then
      raise exception 'Settlement transfers must include both members.';
    end if;

    if transfer_record ->> 'fromMemberId' = transfer_record ->> 'toMemberId' then
      raise exception 'A settlement transfer cannot pay the same member.';
    end if;

    if not exists (
      select 1
      from public.trip_members
      where id = (transfer_record ->> 'fromMemberId')::uuid
        and trip_id = target_trip_id
    ) then
      raise exception 'Settlement transfer payer is not a member of this trip.';
    end if;

    if not exists (
      select 1
      from public.trip_members
      where id = (transfer_record ->> 'toMemberId')::uuid
        and trip_id = target_trip_id
    ) then
      raise exception 'Settlement transfer recipient is not a member of this trip.';
    end if;

    insert into public.trip_settlement_transfers (
      trip_id,
      from_member_id,
      to_member_id,
      amount,
      currency_code
    )
    values (
      target_trip_id,
      (transfer_record ->> 'fromMemberId')::uuid,
      (transfer_record ->> 'toMemberId')::uuid,
      transfer_amount,
      transfer_currency
    );
  end loop;

  update public.trips
  set status = case
        when exists (
          select 1
          from public.trip_settlement_transfers
          where trip_id = target_trip_id
        ) then 'completed'
        else 'settled'
      end,
      completed_at = timezone('utc', now()),
      completed_by_user_id = auth.uid(),
      settled_at = case
        when exists (
          select 1
          from public.trip_settlement_transfers
          where trip_id = target_trip_id
        ) then null
        else timezone('utc', now())
      end
  where id = target_trip_id;

  select *
  into completed_trip
  from public.trips
  where id = target_trip_id;

  return completed_trip;
end;
$$;

create or replace function public.mark_settlement_transfer_paid(target_transfer_id uuid)
returns public.trip_settlement_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_transfer public.trip_settlement_transfers;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to mark a payment.';
  end if;

  if not public.can_mark_settlement_transfer_paid(target_transfer_id) then
    raise exception 'Only the payer can mark this transfer as paid.';
  end if;

  update public.trip_settlement_transfers
  set status = 'paid',
      paid_marked_at = timezone('utc', now()),
      paid_marked_by_user_id = auth.uid()
  where id = target_transfer_id
    and status = 'pending'
  returning *
  into updated_transfer;

  if updated_transfer.id is null then
    raise exception 'This payment is no longer pending.';
  end if;

  return updated_transfer;
end;
$$;

create or replace function public.confirm_settlement_transfer_received(target_transfer_id uuid)
returns public.trip_settlement_transfers
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_transfer public.trip_settlement_transfers;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to confirm a payment.';
  end if;

  if not public.can_confirm_settlement_transfer_received(target_transfer_id) then
    raise exception 'Only the recipient can confirm this payment.';
  end if;

  update public.trip_settlement_transfers
  set status = 'confirmed',
      confirmed_at = timezone('utc', now()),
      confirmed_by_user_id = auth.uid()
  where id = target_transfer_id
    and status = 'paid'
  returning *
  into updated_transfer;

  if updated_transfer.id is null then
    raise exception 'Only paid transfers can be confirmed.';
  end if;

  update public.trips
  set status = 'settled',
      settled_at = timezone('utc', now())
  where id = updated_transfer.trip_id
    and not exists (
      select 1
      from public.trip_settlement_transfers
      where trip_id = updated_transfer.trip_id
        and status <> 'confirmed'
    );

  return updated_transfer;
end;
$$;

drop policy if exists "trips_update_for_creators" on public.trips;

create policy "trips_update_for_creators"
on public.trips
for update
using (
  public.is_trip_creator(id)
  and public.is_trip_active(id)
)
with check (
  created_by_user_id = auth.uid()
  and owner_user_id = auth.uid()
  and status = 'active'
);

drop policy if exists "trip_members_insert_for_creators" on public.trip_members;
drop policy if exists "trip_members_update_for_creators" on public.trip_members;
drop policy if exists "trip_members_delete_for_creators" on public.trip_members;

create policy "trip_members_insert_for_creators"
on public.trip_members
for insert
with check (
  public.is_trip_creator(trip_id)
  and public.is_trip_active(trip_id)
);

create policy "trip_members_update_for_creators"
on public.trip_members
for update
using (
  public.is_trip_creator(trip_id)
  and public.is_trip_active(trip_id)
)
with check (
  public.is_trip_creator(trip_id)
  and public.is_trip_active(trip_id)
);

create policy "trip_members_delete_for_creators"
on public.trip_members
for delete
using (
  public.is_trip_creator(trip_id)
  and public.is_trip_active(trip_id)
);

drop policy if exists "expenses_insert_for_members" on public.expenses;
drop policy if exists "expenses_update_for_creators" on public.expenses;
drop policy if exists "expenses_delete_for_creators" on public.expenses;

create policy "expenses_insert_for_members"
on public.expenses
for insert
with check (
  public.is_trip_active(trip_id)
  and (
    public.is_trip_creator(trip_id)
    or public.is_trip_member(trip_id)
  )
  and created_by_user_id = auth.uid()
);

create policy "expenses_update_for_creators"
on public.expenses
for update
using (
  public.can_edit_expense(id)
  and public.is_trip_active(trip_id)
)
with check (
  created_by_user_id = auth.uid()
  and public.is_trip_active(trip_id)
);

create policy "expenses_delete_for_creators"
on public.expenses
for delete
using (
  public.can_edit_expense(id)
  and public.is_trip_active(trip_id)
);

drop policy if exists "expense_participants_insert_for_expense_creators" on public.expense_participants;
drop policy if exists "expense_participants_update_for_expense_creators" on public.expense_participants;
drop policy if exists "expense_participants_delete_for_expense_creators" on public.expense_participants;

create policy "expense_participants_insert_for_expense_creators"
on public.expense_participants
for insert
with check (
  public.can_edit_expense(expense_id)
  and public.is_expense_trip_active(expense_id)
);

create policy "expense_participants_update_for_expense_creators"
on public.expense_participants
for update
using (
  public.can_edit_expense(expense_id)
  and public.is_expense_trip_active(expense_id)
)
with check (
  public.can_edit_expense(expense_id)
  and public.is_expense_trip_active(expense_id)
);

create policy "expense_participants_delete_for_expense_creators"
on public.expense_participants
for delete
using (
  public.can_edit_expense(expense_id)
  and public.is_expense_trip_active(expense_id)
);

alter table public.trip_settlement_transfers enable row level security;

drop policy if exists "trip_settlement_transfers_select_for_members" on public.trip_settlement_transfers;

create policy "trip_settlement_transfers_select_for_members"
on public.trip_settlement_transfers
for select
using (
  public.is_trip_creator(trip_id)
  or public.is_trip_member(trip_id)
);
