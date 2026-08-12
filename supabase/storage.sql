-- Optional: create a public bucket for lesson images (also auto-created on first admin upload).
-- Run in Supabase → SQL Editor if you prefer manual setup.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'liq-content',
  'liq-content',
  true,
  8388608,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read liq-content" on storage.objects;
create policy "Public read liq-content"
  on storage.objects for select
  using (bucket_id = 'liq-content');

drop policy if exists "Service role manage liq-content" on storage.objects;
-- Service role bypasses RLS; anon/authenticated writes stay blocked by default.
