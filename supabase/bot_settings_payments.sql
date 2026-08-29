-- Support chat URL for Help button + payment fields (safe to re-run).
-- Run in Supabase → SQL Editor.

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

alter table public.bot_settings
  add column if not exists support_chat_url text not null default 'https://t.me/Liq_Academy_bot';

update public.bot_settings
set
  payment_amount = coalesce(nullif(payment_amount, ''), 'UPDATE_ME'),
  payment_account_name = coalesce(nullif(payment_account_name, ''), 'UPDATE_ME'),
  telebirr_phone = coalesce(nullif(telebirr_phone, ''), 'UPDATE_ME'),
  telebirr_name = coalesce(nullif(telebirr_name, ''), 'Telebirr'),
  cbe_account_number = coalesce(nullif(cbe_account_number, ''), 'UPDATE_ME'),
  cbe_account_name = coalesce(nullif(cbe_account_name, ''), 'CBE Birr'),
  support_chat_url = coalesce(nullif(support_chat_url, ''), 'https://t.me/Liq_Academy_bot'),
  updated_at = now()
where id = 1;
