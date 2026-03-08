-- =============================================================================
-- Run in Supabase Dashboard → SQL Editor (one-time setup)
-- Creates: scenes, audios tables + RLS + audios storage bucket + policies
-- =============================================================================

-- 1. Scenes table (user rooms/scenes)
create table if not exists public.scenes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text default '',
  labels jsonb default '[]',
  created_at timestamptz not null default now(),
  "order" int
);

-- 2. Audios table (audio items per scene)
create table if not exists public.audios (
  id text primary key,
  scene_id text not null references public.scenes(id) on delete cascade,
  name text not null,
  source_url text not null,
  kind text default 'file',
  created_at timestamptz not null default now(),
  "order" int
);

create index if not exists idx_scenes_user_id on public.scenes(user_id);
create index if not exists idx_audios_scene_id on public.audios(scene_id);

alter table public.scenes enable row level security;
alter table public.audios enable row level security;

-- 3. RLS: users can only manage their own scenes and audios
drop policy if exists "Users can manage own scenes" on public.scenes;
create policy "Users can manage own scenes"
  on public.scenes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage audios of own scenes" on public.audios;
create policy "Users can manage audios of own scenes"
  on public.audios for all
  using (
    exists (
      select 1 from public.scenes s
      where s.id = audios.scene_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.scenes s
      where s.id = audios.scene_id and s.user_id = auth.uid()
    )
  );

-- 4. Storage bucket "audios" (25 MB max, audio only)
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

-- 5. Storage RLS: upload to own folder, public read, delete own
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

-- 6. Optional: function for API to ensure storage policies
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
    with check (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);

  drop policy if exists "Public read for audios bucket" on storage.objects;
  create policy "Public read for audios bucket"
    on storage.objects for select to public
    using (bucket_id = 'audios');

  drop policy if exists "Users can delete own audios" on storage.objects;
  create policy "Users can delete own audios"
    on storage.objects for delete to authenticated
    using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);
end;
$$;
