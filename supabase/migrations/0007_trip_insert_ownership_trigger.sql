create or replace function public.assign_trip_ownership_from_auth()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to create a trip.';
  end if;

  new.owner_user_id := auth.uid();
  new.created_by_user_id := auth.uid();

  return new;
end;
$$;

drop trigger if exists set_trip_ownership_from_auth on public.trips;

create trigger set_trip_ownership_from_auth
before insert on public.trips
for each row
execute function public.assign_trip_ownership_from_auth();
