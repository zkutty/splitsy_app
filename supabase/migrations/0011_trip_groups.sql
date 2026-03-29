-- Create trip_groups table
create table if not exists public.trip_groups (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  created_by_user_id uuid references public.users(id)
);

create unique index trip_groups_trip_id_name_idx
  on public.trip_groups (trip_id, lower(name));

create index trip_groups_trip_id_idx
  on public.trip_groups (trip_id);

-- Add group_id to trip_members
alter table public.trip_members
  add column if not exists group_id uuid references public.trip_groups(id) on delete set null;

create index trip_members_group_id_idx
  on public.trip_members (group_id) where group_id is not null;

-- Update trip_settlement_transfers to support group entities
alter table public.trip_settlement_transfers
  add column if not exists from_group_id uuid references public.trip_groups(id),
  add column if not exists to_group_id uuid references public.trip_groups(id),
  alter column from_member_id drop not null,
  alter column to_member_id drop not null;

-- Ensure transfer has either member OR group (not both)
alter table public.trip_settlement_transfers
  add constraint settlement_from_entity_check
    check ((from_member_id is not null and from_group_id is null) or
           (from_member_id is null and from_group_id is not null)),
  add constraint settlement_to_entity_check
    check ((to_member_id is not null and to_group_id is null) or
           (to_member_id is null and to_group_id is not null));

-- RLS policies for trip_groups
alter table public.trip_groups enable row level security;

create policy "trip_groups_select_for_members"
  on public.trip_groups for select
  using (public.is_trip_creator(trip_id) or public.is_trip_member(trip_id));

create policy "trip_groups_insert_for_creators"
  on public.trip_groups for insert
  with check (public.is_trip_creator(trip_id) and public.is_trip_active(trip_id));

create policy "trip_groups_update_for_creators"
  on public.trip_groups for update
  using (public.is_trip_creator(trip_id) and public.is_trip_active(trip_id));

create policy "trip_groups_delete_for_creators"
  on public.trip_groups for delete
  using (public.is_trip_creator(trip_id) and public.is_trip_active(trip_id));

-- Update helper functions for group support
create or replace function public.can_mark_settlement_transfer_paid(target_transfer_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_settlement_transfers tst
    left join public.trip_members tm_from on tm_from.id = tst.from_member_id
    left join public.trip_members tm_group on tm_group.group_id = tst.from_group_id
    where tst.id = target_transfer_id
      and (
        -- Direct member transfer
        tm_from.user_id = auth.uid()
        or
        -- Any member of the from_group can mark paid
        tm_group.user_id = auth.uid()
      )
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
    from public.trip_settlement_transfers tst
    left join public.trip_members tm_to on tm_to.id = tst.to_member_id
    left join public.trip_members tm_group on tm_group.group_id = tst.to_group_id
    where tst.id = target_transfer_id
      and (
        -- Direct member transfer
        tm_to.user_id = auth.uid()
        or
        -- Any member of the to_group can confirm
        tm_group.user_id = auth.uid()
      )
  );
$$;

-- Update complete_trip function to handle groups
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
  from_member_id_val uuid;
  to_member_id_val uuid;
  from_group_id_val uuid;
  to_group_id_val uuid;
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

    -- Extract entity IDs (member or group)
    from_member_id_val := (transfer_record -> 'fromEntity' ->> 'memberId')::uuid;
    from_group_id_val := (transfer_record -> 'fromEntity' ->> 'groupId')::uuid;
    to_member_id_val := (transfer_record -> 'toEntity' ->> 'memberId')::uuid;
    to_group_id_val := (transfer_record -> 'toEntity' ->> 'groupId')::uuid;

    -- Validate from entity
    if from_member_id_val is null and from_group_id_val is null then
      raise exception 'Settlement transfer must include a from entity (member or group).';
    end if;

    if from_member_id_val is not null and from_group_id_val is not null then
      raise exception 'Settlement transfer cannot have both from_member_id and from_group_id.';
    end if;

    -- Validate to entity
    if to_member_id_val is null and to_group_id_val is null then
      raise exception 'Settlement transfer must include a to entity (member or group).';
    end if;

    if to_member_id_val is not null and to_group_id_val is not null then
      raise exception 'Settlement transfer cannot have both to_member_id and to_group_id.';
    end if;

    -- Validate from entity exists in trip
    if from_member_id_val is not null then
      if not exists (
        select 1
        from public.trip_members
        where id = from_member_id_val
          and trip_id = target_trip_id
      ) then
        raise exception 'Settlement transfer payer is not a member of this trip.';
      end if;
    end if;

    if from_group_id_val is not null then
      if not exists (
        select 1
        from public.trip_groups
        where id = from_group_id_val
          and trip_id = target_trip_id
      ) then
        raise exception 'Settlement transfer payer group does not exist in this trip.';
      end if;
    end if;

    -- Validate to entity exists in trip
    if to_member_id_val is not null then
      if not exists (
        select 1
        from public.trip_members
        where id = to_member_id_val
          and trip_id = target_trip_id
      ) then
        raise exception 'Settlement transfer recipient is not a member of this trip.';
      end if;
    end if;

    if to_group_id_val is not null then
      if not exists (
        select 1
        from public.trip_groups
        where id = to_group_id_val
          and trip_id = target_trip_id
      ) then
        raise exception 'Settlement transfer recipient group does not exist in this trip.';
      end if;
    end if;

    -- Prevent self-payment
    if from_member_id_val = to_member_id_val
      or from_group_id_val = to_group_id_val then
      raise exception 'A settlement transfer cannot pay the same entity.';
    end if;

    insert into public.trip_settlement_transfers (
      trip_id,
      from_member_id,
      from_group_id,
      to_member_id,
      to_group_id,
      amount,
      currency_code
    )
    values (
      target_trip_id,
      from_member_id_val,
      from_group_id_val,
      to_member_id_val,
      to_group_id_val,
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
