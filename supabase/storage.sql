-- Optional cleanup: admin image upload UI was removed (text/markdown only).
-- Safe to run in Supabase SQL Editor. Keeps existing lesson text; only drops storage objects/bucket if present.

drop policy if exists "Public read liq-content" on storage.objects;
drop policy if exists "Service role manage liq-content" on storage.objects;

delete from storage.objects where bucket_id = 'liq-content';
delete from storage.buckets where id = 'liq-content';
