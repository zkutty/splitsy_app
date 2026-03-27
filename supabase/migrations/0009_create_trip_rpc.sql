create or replace function public.create_trip(
  trip_name text,
  trip_destination text,
  trip_currency_code char(3),
  trip_start_date date,
  trip_end_date date,
  creator_display_name text,
  creator_email text,
  creator_avatar_url text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  created_trip_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a trip.';
  end if;

  insert into public.users (
    id,
    email,
    display_name,
    avatar_url
  )
  values (
    auth.uid(),
    coalesce(nullif(trim(creator_email), ''), public.current_user_email()),
    coalesce(nullif(trim(creator_display_name), ''), 'Traveler'),
    nullif(trim(creator_avatar_url), '')
  )
  on conflict (id) do update
  set email = excluded.email,
      display_name = excluded.display_name,
      avatar_url = excluded.avatar_url;

  insert into public.trips (
    owner_user_id,
    created_by_user_id,
    name,
    destination,
    trip_currency_code,
    start_date,
    end_date
  )
  values (
    auth.uid(),
    auth.uid(),
    trim(trip_name),
    nullif(trim(trip_destination), ''),
    upper(trip_currency_code),
    trip_start_date,
    trip_end_date
  )
  returning id into created_trip_id;

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
    created_trip_id,
    auth.uid(),
    coalesce(nullif(trim(creator_display_name), ''), 'Traveler'),
    coalesce(nullif(trim(creator_email), ''), public.current_user_email()),
    public.current_user_email(),
    nullif(trim(creator_avatar_url), ''),
    timezone('utc', now())
  );

  return created_trip_id;
end;
$$;
