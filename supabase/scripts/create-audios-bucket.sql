-- Run this in Supabase Dashboard → SQL Editor if you get "Bucket not found".
-- Creates the "audios" bucket and RLS policies for uploads (25 MB max, audio only).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'audios',
  'audios',
  true,
  26214400,
  array['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can upload audios to own folder" on storage.objects;
create policy "Users can upload audios to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'audios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Public read for audios bucket" on storage.objects;
create policy "Public read for audios bucket"
  on storage.objects for select to public
  using (bucket_id = 'audios');

drop policy if exists "Users can delete own audios" on storage.objects;
create policy "Users can delete own audios"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'audios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
