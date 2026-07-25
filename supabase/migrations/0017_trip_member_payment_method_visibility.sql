-- ZKU-51: Allow trip co-members to look up each other's payment method for
-- settle-up deep links, without broadening the users_can_read_their_profile
-- policy (which would expose the full users row to any co-member).
--
-- Adds a SECURITY DEFINER RPC that returns only payment_method_type /
-- payment_method_handle for a target user, gated on the caller sharing a
-- (non-removed) trip membership with that user.

create or replace function public.shares_trip_with_member(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members caller_member
    join public.trip_members target_member
      on target_member.trip_id = caller_member.trip_id
    where caller_member.user_id = auth.uid()
      and caller_member.status <> 'removed'
      and target_member.user_id = target_user_id
      and target_member.status <> 'removed'
  );
$$;

create or replace function public.get_trip_member_payment_method(target_user_id uuid)
returns table (payment_method_type text, payment_method_handle text)
language sql
stable
security definer
set search_path = public
as $$
  select u.payment_method_type, u.payment_method_handle
  from public.users u
  where u.id = target_user_id
    and (
      target_user_id = auth.uid()
      or public.shares_trip_with_member(target_user_id)
    );
$$;
