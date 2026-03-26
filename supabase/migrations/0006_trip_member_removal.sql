alter table public.trip_members
  add column if not exists status text,
  add column if not exists removed_at timestamptz,
  add column if not exists removed_by_user_id uuid references public.users(id);

update public.trip_members
set status = coalesce(status, 'active');

alter table public.trip_members
  alter column status set default 'active';

alter table public.trip_members
  alter column status set not null;

alter table public.trip_members
  drop constraint if exists trip_members_status_check;

alter table public.trip_members
  add constraint trip_members_status_check
  check (status in ('active', 'removed'));

create index if not exists trip_members_trip_id_status_idx
  on public.trip_members (trip_id, status);

create or replace function public.is_trip_member(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members
    where trip_id = target_trip_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function public.claim_trip_memberships_for_current_user()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_user_email text;
  claimed_count integer;
begin
  if auth.uid() is null then
    return 0;
  end if;

  normalized_user_email := public.current_user_email();

  if normalized_user_email is null then
    return 0;
  end if;

  with claimed_rows as (
    update public.trip_members as tm
    set user_id = auth.uid(),
        claimed_at = coalesce(tm.claimed_at, timezone('utc', now())),
        normalized_email = normalized_user_email
    where tm.user_id is null
      and tm.status = 'active'
      and tm.normalized_email = normalized_user_email
      and not exists (
        select 1
        from public.trip_members as existing_member
        where existing_member.trip_id = tm.trip_id
          and existing_member.user_id = auth.uid()
          and existing_member.status = 'active'
      )
    returning 1
  )
  select count(*) into claimed_count
  from claimed_rows;

  return claimed_count;
end;
$$;

create or replace function public.accept_trip_invite(invite_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.trip_invites;
  profile_row public.users;
  existing_member public.trip_members;
  claimed_member public.trip_members;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to accept an invite.';
  end if;

  select *
  into invite_row
  from public.trip_invites
  where token = invite_token;

  if invite_row.id is null then
    raise exception 'Invite link is invalid.';
  end if;

  if invite_row.status = 'accepted' and invite_row.accepted_by_user_id = auth.uid() then
    return invite_row.trip_id;
  end if;

  if invite_row.status <> 'pending' then
    raise exception 'Invite link is no longer active.';
  end if;

  if invite_row.expires_at < timezone('utc', now()) then
    update public.trip_invites
    set status = 'expired'
    where id = invite_row.id;

    raise exception 'Invite link has expired.';
  end if;

  if not public.is_trip_active(invite_row.trip_id) then
    raise exception 'This trip is no longer accepting new members.';
  end if;

  select *
  into profile_row
  from public.users
  where id = auth.uid();

  if profile_row.id is null then
    raise exception 'Your profile must be initialized before accepting an invite.';
  end if;

  select *
  into existing_member
  from public.trip_members
  where trip_id = invite_row.trip_id
    and user_id = auth.uid()
  limit 1;

  if existing_member.id is not null then
    if existing_member.status = 'removed' then
      update public.trip_members
      set status = 'active',
          removed_at = null,
          removed_by_user_id = null,
          claimed_at = coalesce(existing_member.claimed_at, timezone('utc', now()))
      where id = existing_member.id
      returning *
      into claimed_member;
    else
      claimed_member := existing_member;
    end if;

    update public.trip_invites
    set status = 'accepted',
        accepted_by_user_id = auth.uid(),
        accepted_at = timezone('utc', now()),
        trip_member_id = claimed_member.id
    where id = invite_row.id;

    return invite_row.trip_id;
  end if;

  if public.current_user_email() is not null then
    update public.trip_members
    set user_id = auth.uid(),
        status = 'active',
        removed_at = null,
        removed_by_user_id = null,
        claimed_at = coalesce(claimed_at, timezone('utc', now())),
        display_name = coalesce(profile_row.display_name, display_name),
        email = coalesce(profile_row.email, email),
        normalized_email = coalesce(public.current_user_email(), normalized_email),
        avatar_url = coalesce(profile_row.avatar_url, avatar_url)
    where id = (
      select id
      from public.trip_members
      where trip_id = invite_row.trip_id
        and normalized_email = public.current_user_email()
      order by status = 'active' desc, joined_at asc
      limit 1
    )
    returning *
    into claimed_member;
  end if;

  if claimed_member.id is null then
    insert into public.trip_members (
      trip_id,
      user_id,
      display_name,
      email,
      normalized_email,
      avatar_url,
      claimed_at,
      status
    )
    values (
      invite_row.trip_id,
      auth.uid(),
      profile_row.display_name,
      profile_row.email,
      public.current_user_email(),
      profile_row.avatar_url,
      timezone('utc', now()),
      'active'
    )
    returning *
    into claimed_member;
  end if;

  update public.trip_invites
  set status = 'accepted',
      accepted_by_user_id = auth.uid(),
      accepted_at = timezone('utc', now()),
      trip_member_id = claimed_member.id
  where id = invite_row.id;

  return invite_row.trip_id;
end;
$$;

create or replace function public.remove_trip_member(target_trip_member_id uuid)
returns public.trip_members
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row public.trip_members;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to remove a member.';
  end if;

  select *
  into member_row
  from public.trip_members
  where id = target_trip_member_id;

  if member_row.id is null then
    raise exception 'Trip member not found.';
  end if;

  if not public.is_trip_creator(member_row.trip_id) then
    raise exception 'Only the trip creator can remove members.';
  end if;

  if not public.is_trip_active(member_row.trip_id) then
    raise exception 'Members can only be removed from active trips.';
  end if;

  if member_row.status = 'removed' then
    return member_row;
  end if;

  if member_row.user_id = auth.uid() then
    raise exception 'Trip creators cannot remove themselves.';
  end if;

  update public.trip_members
  set status = 'removed',
      removed_at = timezone('utc', now()),
      removed_by_user_id = auth.uid()
  where id = target_trip_member_id
  returning *
  into member_row;

  return member_row;
end;
$$;
