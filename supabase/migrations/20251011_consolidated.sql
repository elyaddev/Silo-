-- === Notifications, Activity, RLS, Indexes, and Username cleanup ===
-- Safe/idempotent. Includes the notification trigger and removes profiles.username (with archive).

-- ---- NOTIFICATIONS ----
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,          -- recipient
  type       text not null,          -- e.g., reply_created
  message_id bigint,
  actor_id   uuid not null,          -- who triggered the event
  created_at timestamptz not null default now(),
  read_at    timestamptz,
  room_id    uuid
);

do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema='public' and table_name='notifications'
      and constraint_name='notifications_message_id_fkey'
  ) then
    alter table public.notifications
      add constraint notifications_message_id_fkey
      foreign key (message_id) references public.messages(id) on delete set null;
  end if;
end $$;

alter table public.notifications enable row level security;

drop policy if exists "recipient can read" on public.notifications;
create policy "recipient can read" on public.notifications
for select to authenticated
using (user_id = auth.uid());

-- Create a notification to OP when someone else replies
create or replace function public.trgfn_message_notifications()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_op uuid;
begin
  if NEW.discussion_id is null then
    return NEW;
  end if;

  select profile_id into v_op
  from public.discussions
  where id = NEW.discussion_id;

  if v_op is null or v_op = NEW.profile_id then
    return NEW; -- don't notify self
  end if;

  insert into public.notifications (user_id, type, message_id, actor_id, room_id, created_at)
  values (v_op, 'reply_created', NEW.id, NEW.profile_id, NEW.room_id, now());

  return NEW;
end
$$;

drop trigger if exists trg_message_notifications on public.messages;
create trigger trg_message_notifications
after insert on public.messages
for each row execute function public.trgfn_message_notifications();

-- View consumed by the UI for the bell
drop view if exists public.notification_items;
create view public.notification_items as
select
  n.id,
  n.type,
  n.room_id,
  n.message_id,
  n.actor_id,
  n.created_at,
  n.read_at,
  m.discussion_id,
  m.parent_id,
  left(coalesce(m.content,''), 120) as message_preview,
  da.is_op  as actor_is_op,
  da.alias  as actor_alias,
  case when da.is_op then 'OP' else 'User ' || da.alias::text end as actor_display_name
from public.notifications n
left join public.messages m
  on m.id = n.message_id
left join public.discussion_aliases da
  on da.discussion_id = m.discussion_id
 and da.user_id       = n.actor_id;

grant select on public.notification_items to anon, authenticated;

-- ---- ACTIVITY (used by UI after posting) ----
create table if not exists public.activity (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  type       text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create or replace function public.trgfn_set_activity_user_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.user_id is null then
    NEW.user_id := auth.uid();
  end if;
  return NEW;
end
$$;

drop trigger if exists trg_set_activity_user_id on public.activity;
create trigger trg_set_activity_user_id
before insert on public.activity
for each row execute function public.trgfn_set_activity_user_id();

alter table public.activity enable row level security;

drop policy if exists "insert own activity" on public.activity;
create policy "insert own activity" on public.activity
for insert to authenticated
with check ( user_id = auth.uid() or user_id is null );

drop policy if exists "read own activity" on public.activity;
create policy "read own activity" on public.activity
for select to authenticated
using ( user_id = auth.uid() );

-- ---- RLS & INSERT HELPERS FOR DISCUSSIONS/MESSAGES ----
create or replace function public.trgfn_set_discussion_profile_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.profile_id is null then
    NEW.profile_id := auth.uid();
  end if;
  return NEW;
end
$$;

drop trigger if exists trg_set_discussion_profile_id on public.discussions;
create trigger trg_set_discussion_profile_id
before insert on public.discussions
for each row execute function public.trgfn_set_discussion_profile_id();

create or replace function public.trgfn_set_message_profile_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.profile_id is null then
    NEW.profile_id := auth.uid();
  end if;
  return NEW;
end
$$;

drop trigger if exists trg_set_message_profile_id on public.messages;
create trigger trg_set_message_profile_id
before insert on public.messages
for each row execute function public.trgfn_set_message_profile_id();

alter table public.rooms       enable row level security;
alter table public.discussions enable row level security;
alter table public.messages    enable row level security;

-- Rooms: readable if public
drop policy if exists "public read public rooms" on public.rooms;
create policy "public read public rooms" on public.rooms
for select to anon, authenticated
using (coalesce(is_private,false) = false);

-- Discussions: read if in a public room; insert if authed & room is public
drop policy if exists "public read in public rooms" on public.discussions;
create policy "public read in public rooms" on public.discussions
for select to anon, authenticated
using (
  exists (select 1 from public.rooms r
          where r.id = room_id and coalesce(r.is_private,false) = false)
);

drop policy if exists "insert discussions in public rooms" on public.discussions;
create policy "insert discussions in public rooms" on public.discussions
for insert to authenticated
with check (
  exists (select 1 from public.rooms r
          where r.id = room_id and coalesce(r.is_private,false) = false)
  and profile_id = auth.uid()
);

-- Messages: read if discussion is in a public room; insert if authed & public
drop policy if exists "public read in public rooms" on public.messages;
create policy "public read in public rooms" on public.messages
for select to anon, authenticated
using (
  exists (
    select 1
    from public.discussions d
    join public.rooms r on r.id = d.room_id
    where d.id = discussion_id
      and coalesce(r.is_private,false) = false
  )
);

drop policy if exists "insert messages in public discussions" on public.messages;
create policy "insert messages in public discussions" on public.messages
for insert to authenticated
with check (
  exists (
    select 1
    from public.discussions d
    join public.rooms r on r.id = d.room_id
    where d.id = discussion_id
      and coalesce(r.is_private,false) = false
  )
  and profile_id = auth.uid()
);

-- ---- Helpful indexes ----
create index if not exists idx_messages_discussion_id     on public.messages(discussion_id);
create index if not exists idx_messages_room_id           on public.messages(room_id);
create index if not exists idx_messages_profile_time      on public.messages(profile_id, created_at desc);
create index if not exists idx_discussions_room_time      on public.discussions(room_id, created_at desc);
create index if not exists idx_notifications_user_time    on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_message      on public.notifications(message_id);

-- ---- USERNAME CLEANUP: archive then drop ----
create table if not exists public._profiles_username_archive (
  user_id uuid primary key,
  username text,
  archived_at timestamptz not null default now()
);

insert into public._profiles_username_archive(user_id, username)
select id, username
from public.profiles
where username is not null
  and id not in (select user_id from public._profiles_username_archive);

do $$
declare r record;
begin
  -- drop constraints referencing username
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname ilike '%username%'
  loop
    execute format('alter table public.profiles drop constraint %I', r.conname);
  end loop;

  -- drop indexes referencing username
  for r in
    select indexname
    from pg_indexes
    where schemaname='public'
      and tablename='profiles'
      and indexname ilike '%username%'
  loop
    execute format('drop index if exists %I', r.indexname);
  end loop;
end $$;

alter table public.profiles drop column if exists username;

-- Refresh REST schema
select pg_notify('pgrst','reload schema');
