alter table public.trips
  add column if not exists created_by_user_id uuid references public.users(id);

update public.trips
set created_by_user_id = owner_user_id
where created_by_user_id is null;

alter table public.trips
  alter column created_by_user_id set not null;

create index if not exists trips_created_by_user_id_idx
  on public.trips (created_by_user_id);

alter table public.trip_members
  add column if not exists normalized_email text,
  add column if not exists claimed_at timestamptz;

update public.trip_members
set normalized_email = nullif(lower(trim(email)), '')
where normalized_email is null;

create unique index if not exists trip_members_trip_id_normalized_email_idx
  on public.trip_members (trip_id, normalized_email)
  where normalized_email is not null;

create index if not exists trip_members_normalized_email_idx
  on public.trip_members (normalized_email)
  where normalized_email is not null;

alter table public.expenses
  add column if not exists created_by_user_id uuid references public.users(id);

update public.expenses
set created_by_user_id = trips.created_by_user_id
from public.trips
where trips.id = expenses.trip_id
  and expenses.created_by_user_id is null;

alter table public.expenses
  alter column created_by_user_id set not null;

create index if not exists expenses_created_by_user_id_idx
  on public.expenses (created_by_user_id);

create or replace function public.current_user_email()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(lower(trim(coalesce(auth.jwt() ->> 'email', ''))), '');
$$;

create or replace function public.is_trip_creator(target_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trips
    where id = target_trip_id
      and created_by_user_id = auth.uid()
  );
$$;

create or replace function public.can_edit_expense(target_expense_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.expenses
    where id = target_expense_id
      and created_by_user_id = auth.uid()
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
      and tm.normalized_email = normalized_user_email
      and not exists (
        select 1
        from public.trip_members as existing_member
        where existing_member.trip_id = tm.trip_id
          and existing_member.user_id = auth.uid()
      )
    returning 1
  )
  select count(*) into claimed_count
  from claimed_rows;

  return claimed_count;
end;
$$;

drop policy if exists "users_manage_owned_or_joined_trips" on public.trips;
drop policy if exists "trips_select_for_members" on public.trips;
drop policy if exists "trips_insert_for_authenticated_users" on public.trips;
drop policy if exists "trips_update_for_creators" on public.trips;
drop policy if exists "trips_delete_for_creators" on public.trips;

create policy "trips_select_for_members"
on public.trips
for select
using (
  public.is_trip_creator(id)
  or public.is_trip_member(id)
);

create policy "trips_insert_for_authenticated_users"
on public.trips
for insert
with check (
  auth.uid() is not null
  and owner_user_id = auth.uid()
  and created_by_user_id = auth.uid()
);

create policy "trips_update_for_creators"
on public.trips
for update
using (public.is_trip_creator(id))
with check (
  created_by_user_id = auth.uid()
  and owner_user_id = auth.uid()
);

create policy "trips_delete_for_creators"
on public.trips
for delete
using (public.is_trip_creator(id));

drop policy if exists "trip_members_can_read_memberships" on public.trip_members;
drop policy if exists "trip_owners_manage_memberships" on public.trip_members;
drop policy if exists "trip_members_select_for_members" on public.trip_members;
drop policy if exists "trip_members_insert_for_creators" on public.trip_members;
drop policy if exists "trip_members_update_for_creators" on public.trip_members;
drop policy if exists "trip_members_delete_for_creators" on public.trip_members;

create policy "trip_members_select_for_members"
on public.trip_members
for select
using (
  public.is_trip_creator(trip_id)
  or public.is_trip_member(trip_id)
);

create policy "trip_members_insert_for_creators"
on public.trip_members
for insert
with check (
  public.is_trip_creator(trip_id)
);

create policy "trip_members_update_for_creators"
on public.trip_members
for update
using (public.is_trip_creator(trip_id))
with check (public.is_trip_creator(trip_id));

create policy "trip_members_delete_for_creators"
on public.trip_members
for delete
using (public.is_trip_creator(trip_id));

drop policy if exists "trip_members_manage_expenses" on public.expenses;
drop policy if exists "expenses_select_for_members" on public.expenses;
drop policy if exists "expenses_insert_for_members" on public.expenses;
drop policy if exists "expenses_update_for_creators" on public.expenses;
drop policy if exists "expenses_delete_for_creators" on public.expenses;

create policy "expenses_select_for_members"
on public.expenses
for select
using (
  public.is_trip_creator(trip_id)
  or public.is_trip_member(trip_id)
);

create policy "expenses_insert_for_members"
on public.expenses
for insert
with check (
  (
    public.is_trip_creator(trip_id)
    or public.is_trip_member(trip_id)
  )
  and created_by_user_id = auth.uid()
);

create policy "expenses_update_for_creators"
on public.expenses
for update
using (public.can_edit_expense(id))
with check (created_by_user_id = auth.uid());

create policy "expenses_delete_for_creators"
on public.expenses
for delete
using (public.can_edit_expense(id));

drop policy if exists "trip_members_manage_expense_participants" on public.expense_participants;
drop policy if exists "expense_participants_select_for_members" on public.expense_participants;
drop policy if exists "expense_participants_insert_for_expense_creators" on public.expense_participants;
drop policy if exists "expense_participants_update_for_expense_creators" on public.expense_participants;
drop policy if exists "expense_participants_delete_for_expense_creators" on public.expense_participants;

create policy "expense_participants_select_for_members"
on public.expense_participants
for select
using (
  exists (
    select 1
    from public.expenses
    where expenses.id = expense_participants.expense_id
      and (
        public.is_trip_creator(expenses.trip_id)
        or public.is_trip_member(expenses.trip_id)
      )
  )
);

create policy "expense_participants_insert_for_expense_creators"
on public.expense_participants
for insert
with check (
  public.can_edit_expense(expense_id)
);

create policy "expense_participants_update_for_expense_creators"
on public.expense_participants
for update
using (public.can_edit_expense(expense_id))
with check (public.can_edit_expense(expense_id));

create policy "expense_participants_delete_for_expense_creators"
on public.expense_participants
for delete
using (public.can_edit_expense(expense_id));
