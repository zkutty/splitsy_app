-- Make open_link invites multi-use: keep status as 'pending' after acceptance
-- so anyone with the link can join the trip.

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

  -- Allow re-entry if user already accepted this specific invite (single-use email_claim)
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
  -- For open_link invites: leave as 'pending' so anyone with the link can join
  if invite_row.invite_type = 'email_claim' then
    update public.trip_invites
    set status = 'accepted',
        accepted_by_user_id = auth.uid(),
        accepted_at = timezone('utc', now()),
        trip_member_id = claimed_member.id
    where id = invite_row.id;
  end if;

  return invite_row.trip_id;
end;
$$;
