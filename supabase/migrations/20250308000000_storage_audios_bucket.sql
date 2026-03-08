-- Bucket for user-uploaded audio (MP3, WAV, OGG; public, 25 MB max)
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

-- RLS: authenticated users can upload only to their own folder (path: userId/...)
drop policy if exists "Users can upload audios to own folder" on storage.objects;
create policy "Users can upload audios to own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'audios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: public read for audios bucket (public bucket)
drop policy if exists "Public read for audios bucket" on storage.objects;
create policy "Public read for audios bucket"
  on storage.objects for select
  to public
  using (bucket_id = 'audios');

-- Users can delete their own uploads
drop policy if exists "Users can delete own audios" on storage.objects;
create policy "Users can delete own audios"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'audios'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
