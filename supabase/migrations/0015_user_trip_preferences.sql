create table if not exists public.user_trip_preferences (
  user_id     uuid not null references public.users(id) on delete cascade,
  trip_id     uuid not null references public.trips(id) on delete cascade,
  is_archived boolean not null default false,
  archived_at timestamptz,
  primary key (user_id, trip_id)
);

create index if not exists user_trip_preferences_user_id_idx
  on public.user_trip_preferences (user_id);

alter table public.user_trip_preferences enable row level security;

create policy "utp_all_own"
  on public.user_trip_preferences
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.archive_trip(target_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to archive a trip.';
  end if;

  if not (public.is_trip_creator(target_trip_id) or public.is_trip_member(target_trip_id)) then
    raise exception 'You do not have access to this trip.';
  end if;

  insert into public.user_trip_preferences (user_id, trip_id, is_archived, archived_at)
  values (auth.uid(), target_trip_id, true, timezone('utc', now()))
  on conflict (user_id, trip_id) do update
    set is_archived = true,
        archived_at = timezone('utc', now());
end;
$$;

create or replace function public.unarchive_trip(target_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to unarchive a trip.';
  end if;

  insert into public.user_trip_preferences (user_id, trip_id, is_archived, archived_at)
  values (auth.uid(), target_trip_id, false, null)
  on conflict (user_id, trip_id) do update
    set is_archived = false,
        archived_at = null;
end;
$$;
