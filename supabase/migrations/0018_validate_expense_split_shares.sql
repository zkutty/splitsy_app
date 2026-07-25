-- ZKU-56: Validate expense split shares server-side, not only in the client.
--
-- Mirrors the tolerance/rounding semantics of
-- packages/domain/src/validation.ts (round to 2 decimals, allow 0.01
-- tolerance):
--   - split_mode = 'equal'        -> no per-share validation required.
--   - split_mode = 'byAmount'     -> sum(split_share) must equal expenses.amount.
--   - split_mode = 'byPercentage' -> sum(split_share) must equal 100.
-- Every participant must have a non-null split_share for byAmount/byPercentage.

-- Pre-migration check: report (do not fail on) any existing rows that would
-- violate the new rule, so they can be reviewed/backfilled manually.
do $$
declare
  invalid_count integer;
begin
  select count(*)
  into invalid_count
  from (
    select e.id
    from public.expenses e
    join public.expense_participants ep on ep.expense_id = e.id
    where e.split_mode in ('byAmount', 'byPercentage')
    group by e.id, e.split_mode, e.amount
    having
      bool_or(ep.split_share is null)
      or (e.split_mode = 'byPercentage' and abs(round(coalesce(sum(ep.split_share), 0), 2) - 100) > 0.01)
      or (e.split_mode = 'byAmount' and abs(round(coalesce(sum(ep.split_share), 0), 2) - e.amount) > 0.01)
  ) as invalid_expenses;

  if invalid_count > 0 then
    raise notice 'ZKU-56: found % existing expense(s) with split shares that do not balance under the new validation rule. These rows were left as-is by this migration; review and correct them manually (see expenses.split_mode / expense_participants.split_share).', invalid_count;
  end if;
end;
$$;

create or replace function public.validate_expense_split_shares(target_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  expense_row public.expenses;
  share_sum numeric(14, 4);
  participant_count integer;
  null_share_count integer;
  tolerance constant numeric := 0.01;
begin
  select *
  into expense_row
  from public.expenses
  where id = target_expense_id;

  -- Expense may already be gone (e.g. cascaded delete within the same
  -- statement) — nothing left to validate.
  if expense_row.id is null then
    return;
  end if;

  if expense_row.split_mode = 'equal' then
    return;
  end if;

  select count(*), count(*) filter (where split_share is null)
  into participant_count, null_share_count
  from public.expense_participants
  where expense_id = target_expense_id;

  if participant_count = 0 then
    return;
  end if;

  if null_share_count > 0 then
    raise exception 'Every participant must have a split share for % splits.', expense_row.split_mode
      using errcode = '23514';
  end if;

  select round(coalesce(sum(split_share), 0), 2)
  into share_sum
  from public.expense_participants
  where expense_id = target_expense_id;

  if expense_row.split_mode = 'byPercentage' then
    if abs(share_sum - 100) > tolerance then
      raise exception 'Percentage splits must add up to 100%% (currently %).', share_sum
        using errcode = '23514';
    end if;
  elsif expense_row.split_mode = 'byAmount' then
    if abs(share_sum - expense_row.amount) > tolerance then
      raise exception 'Amount splits must add up to the expense total % (currently %).', expense_row.amount, share_sum
        using errcode = '23514';
    end if;
  end if;
end;
$$;

create or replace function public.trg_validate_expense_split_shares()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.validate_expense_split_shares(OLD.expense_id);
    return OLD;
  end if;

  perform public.validate_expense_split_shares(NEW.expense_id);
  return NEW;
end;
$$;

drop trigger if exists expense_participants_validate_split_shares on public.expense_participants;

-- Deferrable + initially deferred so the check runs once at the end of the
-- transaction (after all participant rows for an expense have been written),
-- rather than failing mid-way through a multi-row insert/replace sequence.
create constraint trigger expense_participants_validate_split_shares
after insert or update or delete on public.expense_participants
deferrable initially deferred
for each row
execute function public.trg_validate_expense_split_shares();

-- Note: validation intentionally lives only on expense_participants, not on
-- expenses.amount/split_mode changes. The app's write path (see
-- apps/expo/src/services/trips-repository.ts createExpense/updateExpense)
-- always issues the expenses update first and then replaces the
-- expense_participants rows as a separate statement; because each
-- supabase-js call is its own transaction, a trigger on the expenses table
-- would see the *old* (not-yet-replaced) participant rows and reject valid
-- updates. Deferring the check to expense_participants writes means it
-- always evaluates against the already-committed, up-to-date expenses row.
