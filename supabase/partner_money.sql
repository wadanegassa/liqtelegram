-- Partner money / expenses (admin Money tab)
-- Safe to re-run in Supabase → SQL Editor

create table if not exists public.partner_expenses (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  partner text,
  amount_etb numeric(12, 2) not null,
  note text not null default '',
  spent_at date not null default (timezone('Africa/Addis_Ababa', now()))::date,
  created_at timestamptz not null default now()
);

-- Rename legacy partner ids if any rows exist
update public.partner_expenses set partner = 'wada' where lower(partner) in ('mw', 'wada');
update public.partner_expenses set partner = 'lemi' where lower(partner) in ('lemi', 'laemi');

alter table public.partner_expenses
  drop constraint if exists partner_expenses_partner_check;
alter table public.partner_expenses
  drop constraint if exists partner_expenses_kind_check;
alter table public.partner_expenses
  drop constraint if exists partner_expenses_amount_check;
alter table public.partner_expenses
  drop constraint if exists partner_expenses_partner_kind_check;
alter table public.partner_expenses
  drop constraint if exists partner_expenses_amount_positive;

alter table public.partner_expenses
  add constraint partner_expenses_kind_check
  check (kind in ('company', 'individual'));

alter table public.partner_expenses
  add constraint partner_expenses_amount_positive
  check (amount_etb > 0);

alter table public.partner_expenses
  add constraint partner_expenses_partner_kind_check
  check (
    (kind = 'company' and partner is null)
    or (kind = 'individual' and partner in ('wada', 'lemi'))
  );

create index if not exists partner_expenses_kind_idx
  on public.partner_expenses(kind);
create index if not exists partner_expenses_partner_idx
  on public.partner_expenses(partner);
create index if not exists partner_expenses_spent_at_idx
  on public.partner_expenses(spent_at desc);

alter table public.partner_expenses enable row level security;
