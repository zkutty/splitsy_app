create table if not exists public.trip_invites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by_user_id uuid not null references public.users(id),
  token text not null unique,
  invite_type text not null default 'open_link' check (invite_type in ('open_link', 'email_claim')),
  target_email text,
  normalized_target_email text,
  trip_member_id uuid references public.trip_members(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  accepted_by_user_id uuid references public.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null default timezone('utc', now()) + interval '30 days',
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists trip_invites_trip_id_idx
  on public.trip_invites (trip_id);

create index if not exists trip_invites_created_by_user_id_idx
  on public.trip_invites (created_by_user_id);

create index if not exists trip_invites_token_idx
  on public.trip_invites (token);

alter table public.trip_invites enable row level security;

create or replace function public.create_trip_invite(target_trip_id uuid)
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

  invite_token := replace(gen_random_uuid()::text, '-', '');

  insert into public.trip_invites (
    trip_id,
    created_by_user_id,
    token,
    invite_type
  )
  values (
    target_trip_id,
    auth.uid(),
    invite_token,
    'open_link'
  );

  return invite_token;
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
    update public.trip_invites
    set status = 'accepted',
        accepted_by_user_id = auth.uid(),
        accepted_at = timezone('utc', now()),
        trip_member_id = existing_member.id
    where id = invite_row.id;

    return invite_row.trip_id;
  end if;

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

  update public.trip_invites
  set status = 'accepted',
      accepted_by_user_id = auth.uid(),
      accepted_at = timezone('utc', now()),
      trip_member_id = claimed_member.id
  where id = invite_row.id;

  return invite_row.trip_id;
end;
$$;

drop policy if exists "trip_invites_select_for_creators" on public.trip_invites;

create policy "trip_invites_select_for_creators"
on public.trip_invites
for select
using (public.is_trip_creator(trip_id));
