-- Run in Supabase SQL Editor. Safe to run multiple times.
-- Option A: You have rooms + audios(room_id) → renames to scenes + scene_id.
-- Option B: You have nothing → creates scenes + audios from scratch.

-- 0. If neither scenes nor rooms exist, create tables from scratch
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'scenes')
     and not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'rooms') then
    create table public.scenes (
      id text primary key,
      user_id uuid not null references auth.users(id) on delete cascade,
      title text not null,
      description text default '',
      labels jsonb default '[]',
      created_at timestamptz not null default now(),
      "order" int
    );
    create index idx_scenes_user_id on public.scenes(user_id);
    alter table public.scenes enable row level security;

    create table public.audios (
      id text primary key,
      scene_id text not null references public.scenes(id) on delete cascade,
      name text not null,
      source_url text not null,
      kind text default 'file',
      created_at timestamptz not null default now(),
      "order" int
    );
    create index idx_audios_scene_id on public.audios(scene_id);
    alter table public.audios enable row level security;
  end if;
end $$;

-- 1. Drop policies only on tables that exist (avoid "relation does not exist")
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'audios') then
    drop policy if exists "Users can manage audios of own rooms" on public.audios;
    drop policy if exists "Users can manage audios of own scenes" on public.audios;
  end if;
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'rooms') then
    drop policy if exists "Users can manage own rooms" on public.rooms;
  end if;
end $$;

-- 2. Rename rooms → scenes (only if rooms exists)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'rooms') then
    alter table public.rooms rename to scenes;
  end if;
end $$;

-- 3. Rename subtitle → description on scenes (if column exists)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'scenes' and column_name = 'subtitle') then
    alter table public.scenes rename column subtitle to description;
  end if;
end $$;

-- 4. Add description column if it doesn't exist (for new scenes table)
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'scenes')
     and not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'scenes' and column_name = 'description') then
    alter table public.scenes add column description text default '';
  end if;
end $$;

-- 5. In audios: rename room_id → scene_id (only if room_id exists)
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'audios' and column_name = 'room_id') then
    alter table public.audios drop constraint if exists audios_room_id_fkey;
    alter table public.audios rename column room_id to scene_id;
    alter table public.audios add constraint audios_scene_id_fkey foreign key (scene_id) references public.scenes(id) on delete cascade;
  end if;
end $$;

-- 6. Rename indexes (only if they exist)
do $$
begin
  if exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'idx_rooms_user_id') then
    alter index public.idx_rooms_user_id rename to idx_scenes_user_id;
  end if;
  if exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'idx_audios_room_id') then
    alter index public.idx_audios_room_id rename to idx_audios_scene_id;
  end if;
end $$;

-- 7. RLS: now create policies on scenes and audios (scenes exists at this point)
drop policy if exists "Users can manage own scenes" on public.scenes;
create policy "Users can manage own scenes"
  on public.scenes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can manage audios of own scenes" on public.audios;
create policy "Users can manage audios of own scenes"
  on public.audios for all
  using (exists (select 1 from public.scenes s where s.id = audios.scene_id and s.user_id = auth.uid()))
  with check (exists (select 1 from public.scenes s where s.id = audios.scene_id and s.user_id = auth.uid()));
