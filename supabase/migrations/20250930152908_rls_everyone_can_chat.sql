-- Make rooms/messages readable & writable by any authenticated user.

-- ROOMS: any signed-in user can see rooms
drop policy if exists "rooms_select_member_or_public" on public.rooms;
create policy "rooms_select_any_authenticated" on public.rooms
for select
using (auth.uid() is not null);

-- ROOMS: keep existing insert/update rules (creator creates/edits)
drop policy if exists "rooms_insert_authenticated" on public.rooms;
create policy "rooms_insert_authenticated" on public.rooms
for insert
with check (exists (select 1 from public.profiles p where p.id = auth.uid()));

drop policy if exists "rooms_update_creator" on public.rooms;
create policy "rooms_update_creator" on public.rooms
for update
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- MESSAGES: any signed-in user can read messages
drop policy if exists "messages_select_member_or_public" on public.messages;
create policy "messages_select_authenticated" on public.messages
for select
using (auth.uid() is not null);

-- MESSAGES: any signed-in user can post as themselves
drop policy if exists "messages_insert_member" on public.messages;
create policy "messages_insert_authenticated_self" on public.messages
for insert
with check (profile_id = auth.uid());

-- MESSAGES: authors can edit/soft-delete their own messages
drop policy if exists "messages_update_self" on public.messages;
create policy "messages_update_self" on public.messages
for update
using (profile_id = auth.uid())
with check (profile_id = auth.uid());
