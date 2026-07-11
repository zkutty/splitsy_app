-- ZKU-57: Add a use cap and a revoke flow for multi-use ("open_link") trip
-- invites, on top of the existing 30-day expiry from 0005_trip_invites.sql
-- and the multi-use behavior added in 0014_multi_use_invite_links.sql.

alter table public.trip_invites
  add column if not exists max_uses integer,
  add column if not exists use_count integer not null default 0;

alter table public.trip_invites
  drop constraint if exists trip_invites_max_uses_check;

alter table public.trip_invites
  add constraint trip_invites_max_uses_check
  check (max_uses is null or max_uses > 0);

alter table public.trip_invites
  drop constraint if exists trip_invites_use_count_check;

alter table public.trip_invites
  add constraint trip_invites_use_count_check
  check (use_count >= 0);

-- Recreate create_trip_invite to accept an optional max_uses cap.
create or replace function public.create_trip_invite(target_trip_id uuid, invite_max_uses integer default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_token text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create an invite.';
  end if;

  if not public.is_trip_creator(target_trip_id) then
    raise exception 'Only the trip creator can create invite links.';
  end if;

  if not public.is_trip_active(target_trip_id) then
    raise exception 'Invite links can only be created for active trips.';
  end if;

  if invite_max_uses is not null and invite_max_uses < 1 then
    raise exception 'Max uses must be at least 1.';
  end if;

  invite_token := replace(gen_random_uuid()::text, '-', '');

  insert into public.trip_invites (
    trip_id,
    created_by_user_id,
    token,
    invite_type,
    max_uses
  )
  values (
    target_trip_id,
    auth.uid(),
    invite_token,
    'open_link',
    invite_max_uses
  );

  return invite_token;
end;
$$;

-- Recreate accept_trip_invite (baseline: 0014_multi_use_invite_links.sql) to
-- reject joins once max_uses has been reached and to surface a clear error
-- for revoked links. use_count is only incremented when the accept actually
-- consumes a new use (i.e. a brand-new member joins) — re-visiting the link
-- as an existing member is a no-op and does not count against the cap.
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
  where token = invite_token
  for update;

  if invite_row.id is null then
    raise exception 'Invite link is invalid.';
  end if;

  -- Allow re-entry if user already accepted this specific invite (single-use email_claim)
  if invite_row.status = 'accepted' and invite_row.accepted_by_user_id = auth.uid() then
    return invite_row.trip_id;
  end if;

  if invite_row.status = 'revoked' then
    raise exception 'This invite link has been revoked.';
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

  -- Check if user is already a member
  select *
  into existing_member
  from public.trip_members
  where trip_id = invite_row.trip_id
    and user_id = auth.uid()
  limit 1;

  if existing_member.id is not null then
    -- For single-use email_claim invites, mark as accepted
    if invite_row.invite_type = 'email_claim' then
      update public.trip_invites
      set status = 'accepted',
          accepted_by_user_id = auth.uid(),
          accepted_at = timezone('utc', now()),
          trip_member_id = existing_member.id
      where id = invite_row.id;
    end if;

    return invite_row.trip_id;
  end if;

  -- This accept will consume a new use (a brand-new member is about to be
  -- added) — enforce the cap before doing any writes.
  if invite_row.max_uses is not null and invite_row.use_count >= invite_row.max_uses then
    raise exception 'This invite link has reached its maximum number of uses.';
  end if;

  -- Try to claim an unclaimed member slot by email
  if public.current_user_email() is not null then
    update public.trip_members
    set user_id = auth.uid(),
        claimed_at = coalesce(claimed_at, timezone('utc', now())),
        display_name = coalesce(profile_row.display_name, display_name),
        email = coalesce(profile_row.email, email),
        normalized_email = coalesce(public.current_user_email(), normalized_email),
        avatar_url = coalesce(profile_row.avatar_url, avatar_url)
    where id = (
      select id
      from public.trip_members
      where trip_id = invite_row.trip_id
        and user_id is null
        and normalized_email = public.current_user_email()
      order by joined_at asc
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
      claimed_at
    )
    values (
      invite_row.trip_id,
      auth.uid(),
      profile_row.display_name,
      profile_row.email,
      public.current_user_email(),
      profile_row.avatar_url,
      timezone('utc', now())
    )
    returning *
    into claimed_member;
  end if;

  -- For email_claim invites: mark as accepted (single-use)
  -- For open_link invites: leave as 'pending' so anyone with the link can join,
  -- but always record the new use against the cap.
  if invite_row.invite_type = 'email_claim' then
    update public.trip_invites
    set status = 'accepted',
        accepted_by_user_id = auth.uid(),
        accepted_at = timezone('utc', now()),
        trip_member_id = claimed_member.id,
        use_count = use_count + 1
    where id = invite_row.id;
  else
    update public.trip_invites
    set accepted_by_user_id = auth.uid(),
        accepted_at = timezone('utc', now()),
        trip_member_id = claimed_member.id,
        use_count = use_count + 1
    where id = invite_row.id;
  end if;

  return invite_row.trip_id;
end;
$$;

-- New RPC: let the trip creator revoke an active (pending) invite link so it
-- can no longer be used to join, even if it hasn't expired or hit its cap.
create or replace function public.revoke_trip_invite(target_invite_id uuid)
returns public.trip_invites
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row public.trip_invites;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to revoke an invite.';
  end if;

  select *
  into invite_row
  from public.trip_invites
  where id = target_invite_id;

  if invite_row.id is null then
    raise exception 'Invite link not found.';
  end if;

  if not public.is_trip_creator(invite_row.trip_id) then
    raise exception 'Only the trip creator can revoke invite links.';
  end if;

  if invite_row.status <> 'pending' then
    raise exception 'Only active invite links can be revoked.';
  end if;

  update public.trip_invites
  set status = 'revoked'
  where id = target_invite_id
  returning *
  into invite_row;

  return invite_row;
end;
$$;
