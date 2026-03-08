-- Rename rooms → scenes and audios.room_id → audios.scene_id (preserves all data)

-- 1. Drop audios RLS policy (references rooms)
drop policy if exists "Users can manage audios of own rooms" on public.audios;

-- 2. Drop rooms RLS policy
drop policy if exists "Users can manage own rooms" on public.rooms;

-- 3. Drop foreign key from audios to rooms
alter table public.audios
  drop constraint if exists audios_room_id_fkey;

-- 4. Rename table rooms → scenes
alter table public.rooms rename to scenes;

-- 5. Rename column room_id → scene_id in audios
alter table public.audios rename column room_id to scene_id;

-- 6. Add foreign key audios.scene_id → scenes.id
alter table public.audios
  add constraint audios_scene_id_fkey
  foreign key (scene_id) references public.scenes(id) on delete cascade;

-- 7. Rename indexes
alter index if exists idx_rooms_user_id rename to idx_scenes_user_id;
alter index if exists idx_audios_room_id rename to idx_audios_scene_id;

-- 8. RLS policies for scenes
create policy "Users can manage own scenes"
  on public.scenes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 9. RLS policies for audios (reference scenes)
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
