-- Partner money / expenses (admin Money tab)
-- Run in Supabase → SQL Editor

create table if not exists public.partner_expenses (
  id uuid primary key default gen_random_uuid(),
  -- company = shared (reduces both); individual = only that partner
  kind text not null check (kind in ('company', 'individual')),
  -- required when kind = individual: 'mw' | 'lemi'
  partner text check (partner is null or partner in ('mw', 'lemi')),
  amount_etb numeric(12, 2) not null check (amount_etb > 0),
  note text not null default '',
  spent_at date not null default (timezone('Africa/Addis_Ababa', now()))::date,
  created_at timestamptz not null default now(),
  constraint partner_expenses_partner_check check (
    (kind = 'company' and partner is null)
    or (kind = 'individual' and partner is not null)
  )
);

create index if not exists partner_expenses_kind_idx
  on public.partner_expenses(kind);
create index if not exists partner_expenses_partner_idx
  on public.partner_expenses(partner);
create index if not exists partner_expenses_spent_at_idx
  on public.partner_expenses(spent_at desc);

alter table public.partner_expenses enable row level security;
-- Admin API uses service role (bypasses RLS).
