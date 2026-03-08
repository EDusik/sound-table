-- Function called by the app (API) to ensure RLS policies exist for the audios bucket.
-- Run with definer rights so it can alter storage policies.
create or replace function public.ensure_audios_storage_policies()
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
begin
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
end;
$$;
