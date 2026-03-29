-- Add split_mode to expenses (equal, byAmount, byPercentage)
alter table public.expenses
  add column if not exists split_mode text not null default 'equal';

-- Add split_share to expense_participants (stores per-member share value)
-- For byAmount mode: the dollar amount each person owes
-- For byPercentage mode: the percentage each person owes
-- NULL means equal split (default)
alter table public.expense_participants
  add column if not exists split_share numeric(12, 4) default null;
