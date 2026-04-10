-- Allow members to depart a trip early with settlement

-- Update member status constraint to include 'departed'
alter table public.trip_members
  drop constraint if exists trip_members_status_check;

alter table public.trip_members
  add constraint trip_members_status_check
  check (status in ('active', 'removed', 'departed'));

-- Add departure tracking columns
alter table public.trip_members
  add column if not exists departed_at timestamptz,
  add column if not exists departed_by_user_id uuid references public.users(id);

-- Add settlement type and departed member tracking to transfers
alter table public.trip_settlement_transfers
  add column if not exists settlement_type text not null default 'trip_completion'
    check (settlement_type in ('trip_completion', 'early_departure')),
  add column if not exists departed_member_id uuid references public.trip_members(id);

create index if not exists trip_settlement_transfers_departed_member_idx
  on public.trip_settlement_transfers (departed_member_id)
  where departed_member_id is not null;

-- RPC: Depart a trip member and record their early settlement transfers
create or replace function public.depart_trip_member(
  target_trip_id uuid,
  target_member_id uuid,
  settlement_transfers jsonb default '[]'::jsonb
)
returns public.trip_members
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row public.trip_members;
  transfer_record jsonb;
  transfer_amount numeric(12, 2);
  transfer_currency char(3);
  from_member_id_val uuid;
  to_member_id_val uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to record a departure.';
  end if;

  if not public.is_trip_creator(target_trip_id) then
    raise exception 'Only the trip creator can record a member departure.';
  end if;

  if not public.is_trip_active(target_trip_id) then
    raise exception 'Members can only depart from active trips.';
  end if;

  select *
  into member_row
  from public.trip_members
  where id = target_member_id
    and trip_id = target_trip_id;

  if member_row.id is null then
    raise exception 'Trip member not found.';
  end if;

  if member_row.status <> 'active' then
    raise exception 'Only active members can depart.';
  end if;

  if member_row.user_id = auth.uid() then
    raise exception 'Trip creators cannot depart from their own trip.';
  end if;

  -- Remove any existing early departure transfers for this member (in case of re-departure)
  delete from public.trip_settlement_transfers
  where trip_id = target_trip_id
    and departed_member_id = target_member_id;

  -- Insert early departure settlement transfers
  if settlement_transfers is not null and jsonb_typeof(settlement_transfers) = 'array' then
    for transfer_record in
      select value
      from jsonb_array_elements(settlement_transfers)
    loop
      transfer_amount := round((transfer_record ->> 'amount')::numeric, 2);
      transfer_currency := upper(transfer_record ->> 'currencyCode');

      if transfer_amount is null or transfer_amount <= 0 then
        raise exception 'Settlement transfer amounts must be greater than zero.';
      end if;

      from_member_id_val := (transfer_record -> 'fromEntity' ->> 'memberId')::uuid;
      to_member_id_val := (transfer_record -> 'toEntity' ->> 'memberId')::uuid;

      if from_member_id_val is null or to_member_id_val is null then
        raise exception 'Early departure transfers must be between individual members.';
      end if;

      if from_member_id_val = to_member_id_val then
        raise exception 'A settlement transfer cannot pay the same member.';
      end if;

      -- Validate both members belong to the trip
      if not exists (
        select 1 from public.trip_members
        where id = from_member_id_val and trip_id = target_trip_id
      ) then
        raise exception 'Settlement transfer payer is not a member of this trip.';
      end if;

      if not exists (
        select 1 from public.trip_members
        where id = to_member_id_val and trip_id = target_trip_id
      ) then
        raise exception 'Settlement transfer recipient is not a member of this trip.';
      end if;

      insert into public.trip_settlement_transfers (
        trip_id,
        from_member_id,
        to_member_id,
        amount,
        currency_code,
        settlement_type,
        departed_member_id
      )
      values (
        target_trip_id,
        from_member_id_val,
        to_member_id_val,
        transfer_amount,
        transfer_currency,
        'early_departure',
        target_member_id
      );
    end loop;
  end if;

  -- Mark member as departed
  update public.trip_members
  set status = 'departed',
      departed_at = timezone('utc', now()),
      departed_by_user_id = auth.uid()
  where id = target_member_id
  returning *
  into member_row;

  return member_row;
end;
$$;

-- RPC: Rejoin a departed member (undo departure)
create or replace function public.rejoin_trip_member(
  target_trip_id uuid,
  target_member_id uuid
)
returns public.trip_members
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row public.trip_members;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to rejoin a member.';
  end if;

  if not public.is_trip_creator(target_trip_id) then
    raise exception 'Only the trip creator can rejoin a member.';
  end if;

  if not public.is_trip_active(target_trip_id) then
    raise exception 'Members can only rejoin active trips.';
  end if;

  select *
  into member_row
  from public.trip_members
  where id = target_member_id
    and trip_id = target_trip_id;

  if member_row.id is null then
    raise exception 'Trip member not found.';
  end if;

  if member_row.status <> 'departed' then
    raise exception 'Only departed members can be rejoined.';
  end if;

  -- Remove all early departure settlement transfers for this member
  delete from public.trip_settlement_transfers
  where trip_id = target_trip_id
    and departed_member_id = target_member_id;

  -- Restore member to active status
  update public.trip_members
  set status = 'active',
      departed_at = null,
      departed_by_user_id = null
  where id = target_member_id
  returning *
  into member_row;

  return member_row;
end;
$$;

-- Update activity log trigger to handle departed/rejoined events
create or replace function public.log_trip_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip_id uuid;
  v_event_type text;
  v_actor_user_id uuid;
  v_actor_member_id uuid;
  v_actor_display_name text;
  v_entity_type text;
  v_entity_id uuid;
  v_payload jsonb;
  v_paid_by_name text;
  v_from_name text;
  v_to_name text;
begin
  v_actor_user_id := auth.uid();

  select display_name into v_actor_display_name
  from public.users where id = v_actor_user_id;

  -- expenses
  if tg_table_name = 'expenses' then
    v_entity_type := 'expense';

    if tg_op = 'INSERT' then
      v_trip_id    := NEW.trip_id;
      v_entity_id  := NEW.id;
      v_event_type := 'expense_added';
      select display_name into v_paid_by_name from public.trip_members where id = NEW.paid_by_member_id;
      v_payload := jsonb_build_object(
        'actor_display_name', v_actor_display_name,
        'amount',             NEW.amount,
        'currency_code',      NEW.currency_code,
        'trip_amount',        NEW.trip_amount,
        'category',           NEW.category,
        'custom_category',    NEW.custom_category,
        'note',               NEW.note,
        'paid_by_name',       v_paid_by_name
      );

    elsif tg_op = 'UPDATE' then
      v_trip_id    := NEW.trip_id;
      v_entity_id  := NEW.id;
      v_event_type := 'expense_edited';
      select display_name into v_paid_by_name from public.trip_members where id = NEW.paid_by_member_id;
      v_payload := jsonb_build_object(
        'actor_display_name', v_actor_display_name,
        'amount',             NEW.amount,
        'currency_code',      NEW.currency_code,
        'trip_amount',        NEW.trip_amount,
        'category',           NEW.category,
        'custom_category',    NEW.custom_category,
        'note',               NEW.note,
        'paid_by_name',       v_paid_by_name
      );

    elsif tg_op = 'DELETE' then
      v_trip_id    := OLD.trip_id;
      v_entity_id  := OLD.id;
      v_event_type := 'expense_deleted';
      v_payload := jsonb_build_object(
        'actor_display_name', v_actor_display_name,
        'amount',             OLD.amount,
        'currency_code',      OLD.currency_code,
        'category',           OLD.category,
        'note',               OLD.note
      );
    end if;

  -- trip_members
  elsif tg_table_name = 'trip_members' then
    v_entity_type := 'member';
    v_trip_id    := coalesce(NEW.trip_id, OLD.trip_id);
    v_entity_id  := coalesce(NEW.id, OLD.id);

    if tg_op = 'INSERT' then
      v_event_type := 'member_added';
      v_payload := jsonb_build_object(
        'actor_display_name',  v_actor_display_name,
        'member_display_name', NEW.display_name
      );

    elsif tg_op = 'UPDATE' then
      if OLD.status != 'removed' and NEW.status = 'removed' then
        v_event_type := 'member_removed';
        v_payload := jsonb_build_object(
          'actor_display_name',  v_actor_display_name,
          'member_display_name', OLD.display_name
        );
      elsif OLD.status = 'active' and NEW.status = 'departed' then
        v_event_type := 'member_departed';
        v_payload := jsonb_build_object(
          'actor_display_name',  v_actor_display_name,
          'member_display_name', OLD.display_name
        );
      elsif OLD.status = 'departed' and NEW.status = 'active' then
        v_event_type := 'member_rejoined';
        v_payload := jsonb_build_object(
          'actor_display_name',  v_actor_display_name,
          'member_display_name', NEW.display_name
        );
      elsif OLD.user_id is null and NEW.user_id is not null then
        v_event_type := 'member_claimed';
        v_payload := jsonb_build_object(
          'actor_display_name',  coalesce(v_actor_display_name, NEW.display_name),
          'member_display_name', NEW.display_name
        );
      else
        return NEW;
      end if;
    end if;

  -- trip_settlement_transfers
  elsif tg_table_name = 'trip_settlement_transfers' then
    v_entity_type := 'settlement';
    v_trip_id   := coalesce(NEW.trip_id, OLD.trip_id);
    v_entity_id := coalesce(NEW.id, OLD.id);

    if tg_op != 'UPDATE' then
      return coalesce(NEW, OLD);
    end if;

    -- Resolve display names
    if NEW.from_member_id is not null then
      select display_name into v_from_name from public.trip_members where id = NEW.from_member_id;
    elsif NEW.from_group_id is not null then
      select name into v_from_name from public.trip_groups where id = NEW.from_group_id;
    end if;

    if NEW.to_member_id is not null then
      select display_name into v_to_name from public.trip_members where id = NEW.to_member_id;
    elsif NEW.to_group_id is not null then
      select name into v_to_name from public.trip_groups where id = NEW.to_group_id;
    end if;

    if OLD.status = 'pending' and NEW.status = 'paid' then
      v_event_type := 'settlement_paid';
      v_payload := jsonb_build_object(
        'actor_display_name', v_actor_display_name,
        'amount',             NEW.amount,
        'currency_code',      NEW.currency_code,
        'from_display_name',  coalesce(v_from_name, 'Unknown'),
        'to_display_name',    coalesce(v_to_name, 'Unknown')
      );
    elsif OLD.status = 'paid' and NEW.status = 'confirmed' then
      v_event_type := 'settlement_confirmed';
      v_payload := jsonb_build_object(
        'actor_display_name', v_actor_display_name,
        'amount',             NEW.amount,
        'currency_code',      NEW.currency_code,
        'from_display_name',  coalesce(v_from_name, 'Unknown'),
        'to_display_name',    coalesce(v_to_name, 'Unknown')
      );
    else
      return NEW;
    end if;

  -- trips (status changes only)
  elsif tg_table_name = 'trips' then
    v_entity_type := 'trip';
    v_trip_id   := coalesce(NEW.id, OLD.id);
    v_entity_id := v_trip_id;

    if tg_op != 'UPDATE' then
      return coalesce(NEW, OLD);
    end if;

    if OLD.status = 'active' and NEW.status = 'completed' then
      v_event_type := 'trip_completed';
      v_payload := jsonb_build_object('actor_display_name', v_actor_display_name);
    elsif OLD.status = 'completed' and NEW.status = 'settled' then
      v_event_type := 'trip_settled';
      v_payload := jsonb_build_object('actor_display_name', v_actor_display_name);
    else
      return NEW;
    end if;

  else
    return coalesce(NEW, OLD);
  end if;

  -- Resolve actor's trip member record
  select id into v_actor_member_id
  from public.trip_members
  where trip_id = v_trip_id
    and user_id = v_actor_user_id
    and status = 'active'
  limit 1;

  insert into public.trip_activity_log (
    trip_id, event_type, actor_user_id, actor_member_id,
    entity_type, entity_id, payload
  ) values (
    v_trip_id, v_event_type, v_actor_user_id, v_actor_member_id,
    v_entity_type, v_entity_id, v_payload
  );

  return coalesce(NEW, OLD);
end;
$$;

-- Update complete_trip to preserve early departure transfers and exclude departed members
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

  -- Only delete trip_completion transfers; preserve early_departure transfers
  delete from public.trip_settlement_transfers
  where trip_id = target_trip_id
    and settlement_type = 'trip_completion';

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
      currency_code,
      settlement_type
    )
    values (
      target_trip_id,
      from_member_id_val,
      from_group_id_val,
      to_member_id_val,
      to_group_id_val,
      transfer_amount,
      transfer_currency,
      'trip_completion'
    );
  end loop;

  update public.trips
  set status = case
        when exists (
          select 1
          from public.trip_settlement_transfers
          where trip_id = target_trip_id
            and status <> 'confirmed'
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
            and status <> 'confirmed'
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
