-- Bot-editable texts / payment details (admin dashboard)
-- Run in Supabase → SQL Editor

create table if not exists public.bot_settings (
  id int primary key default 1 check (id = 1),
  welcome_text text not null default '',
  payment_instructions text not null default '',
  help_text text not null default '',
  ask_screenshot_text text not null default '',
  proof_received_text text not null default '',
  approved_text text not null default '',
  rejected_text text not null default '',
  status_member_text text not null default '',
  status_pending_text text not null default '',
  status_none_text text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.bot_settings enable row level security;

insert into public.bot_settings (
  id,
  welcome_text,
  payment_instructions,
  help_text,
  ask_screenshot_text,
  proof_received_text,
  approved_text,
  rejected_text,
  status_member_text,
  status_pending_text,
  status_none_text
) values (
  1,
  'Welcome to *Liq Academy*, {{first_name}}!

Use the menu below, or send a payment screenshot after you pay.',
  '🎓 *Liq Academy — Join the paid community*

Pay, then send a *screenshot* of your payment here.

💳 *Payment details*
• Amount: UPDATE_ME ETB
• Method: Telebirr / CBE Birr / Bank
• Account name: UPDATE_ME
• Account number: UPDATE_ME

After paying, send a clear screenshot in this chat.
An admin will approve it, then you get a one-time invite link.',
  '*How joining works*
1. Pay using the details from How to pay
2. Send a clear *screenshot* in this private chat
3. Admins review it in the proof group
4. If approved, you get a *one-time* invite link

Mini App: {{mini_app_url}}',
  'Great — send your payment screenshot as a photo in this chat now.',
  '✅ Proof received. An admin will review it soon. Use My status anytime.',
  '✅ Payment approved — welcome to Liq Academy!

Here is your *one-time* invite link (expires in 24h):
{{invite_link}}

Mini App: {{mini_app_url}}',
  '❌ Your payment proof was rejected. Please send a clearer screenshot of a successful payment.',
  '✅ You are an approved member. If you lost the invite, ask an admin to send a new one.',
  '⏳ Your proof is waiting for admin review.',
  'No payment proof yet. Pay, then send a screenshot here.'
)
on conflict (id) do nothing;
