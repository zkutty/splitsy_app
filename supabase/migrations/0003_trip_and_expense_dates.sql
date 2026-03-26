alter table public.expenses
  add column if not exists expense_date date;

update public.expenses
set expense_date = coalesce(expense_date, created_at::date, current_date);

alter table public.expenses
  alter column expense_date set default current_date,
  alter column expense_date set not null;

create index if not exists expenses_trip_id_expense_date_idx
  on public.expenses (trip_id, expense_date desc, created_at desc);
