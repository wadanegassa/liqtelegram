-- Add Telebirr + CBE payment fields for copyable bot buttons.
-- Run in Supabase → SQL Editor (safe to re-run).

alter table public.bot_settings
  add column if not exists payment_amount text not null default 'UPDATE_ME';

alter table public.bot_settings
  add column if not exists payment_account_name text not null default 'UPDATE_ME';

alter table public.bot_settings
  add column if not exists telebirr_phone text not null default 'UPDATE_ME';

alter table public.bot_settings
  add column if not exists telebirr_name text not null default 'Telebirr';

alter table public.bot_settings
  add column if not exists cbe_account_number text not null default 'UPDATE_ME';

alter table public.bot_settings
  add column if not exists cbe_account_name text not null default 'CBE Birr';

update public.bot_settings
set
  payment_amount = coalesce(nullif(payment_amount, ''), 'UPDATE_ME'),
  payment_account_name = coalesce(nullif(payment_account_name, ''), 'UPDATE_ME'),
  telebirr_phone = coalesce(nullif(telebirr_phone, ''), 'UPDATE_ME'),
  telebirr_name = coalesce(nullif(telebirr_name, ''), 'Telebirr'),
  cbe_account_number = coalesce(nullif(cbe_account_number, ''), 'UPDATE_ME'),
  cbe_account_name = coalesce(nullif(cbe_account_name, ''), 'CBE Birr'),
  updated_at = now()
where id = 1;
