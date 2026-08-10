-- Payment / membership tables for the Telegram bot
-- Run in Supabase → SQL Editor after the main schema

create table if not exists public.members (
  telegram_user_id bigint primary key,
  username text,
  first_name text,
  last_name text,
  status text not null default 'active'
    check (status in ('active', 'revoked')),
  approved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id bigint not null,
  username text,
  first_name text,
  last_name text,
  caption text not null default '',
  file_id text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  admin_chat_id bigint,
  admin_message_id bigint,
  reviewed_by bigint,
  reviewed_at timestamptz,
  invite_link text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_requests_user_idx
  on public.payment_requests(telegram_user_id);
create index if not exists payment_requests_status_idx
  on public.payment_requests(status);

alter table public.members enable row level security;
alter table public.payment_requests enable row level security;

-- Bot uses service role key (bypasses RLS). No public policies needed.
