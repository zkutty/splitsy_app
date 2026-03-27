drop policy if exists "trips_insert_for_authenticated_users" on public.trips;

create policy "trips_insert_for_authenticated_users"
on public.trips
for insert
with check (
  auth.uid() is not null
);
