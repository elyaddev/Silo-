-- === Per-discussion aliases (OP/User N) ===
-- Safe/idempotent. Creates table, helper functions, triggers, and the view used by the UI.

-- Table
create table if not exists public.discussion_aliases (
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  user_id       uuid not null references public.profiles(id)   on delete cascade,
  alias         int,
  is_op         boolean not null default false,
  created_at    timestamptz not null default now(),
  primary key (discussion_id, user_id),
  constraint unique_alias_per_discussion
    unique (discussion_id, alias) deferrable initially immediate
);

-- Assign OP / next User N
create or replace function public.ensure_discussion_alias(p_discussion uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_op  boolean;
  v_has    boolean;
  v_next   int;
begin
  -- already has alias?
  select true into v_has
  from public.discussion_aliases
  where discussion_id = p_discussion and user_id = p_user
  limit 1;
  if v_has then return; end if;

  -- serialize per-discussion assignment
  perform 1 from public.discussions where id = p_discussion for update;

  -- is OP?
  select (d.profile_id = p_user) into v_is_op
  from public.discussions d where d.id = p_discussion;

  if v_is_op then
    insert into public.discussion_aliases(discussion_id, user_id, alias, is_op)
    values (p_discussion, p_user, null, true)
    on conflict (discussion_id, user_id) do nothing;
  else
    select coalesce(max(alias), 0) + 1
      into v_next
      from public.discussion_aliases
     where discussion_id = p_discussion
       and is_op = false;

    insert into public.discussion_aliases(discussion_id, user_id, alias, is_op)
    values (p_discussion, p_user, v_next, false)
    on conflict (discussion_id, user_id) do nothing;
  end if;
end
$$;

-- Ensure alias when a message is inserted
create or replace function public.trgfn_ensure_alias_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.discussion_id is not null and NEW.profile_id is not null then
    perform public.ensure_discussion_alias(NEW.discussion_id, NEW.profile_id);
  end if;
  return NEW;
end
$$;

drop trigger if exists trg_ensure_alias_on_message on public.messages;
create trigger trg_ensure_alias_on_message
after insert on public.messages
for each row
execute function public.trgfn_ensure_alias_on_message();

-- Ensure OP alias when a discussion is created
create or replace function public.trgfn_ensure_op_on_discussion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.id is not null and NEW.profile_id is not null then
    insert into public.discussion_aliases(discussion_id, user_id, alias, is_op)
    values (NEW.id, NEW.profile_id, null, true)
    on conflict (discussion_id, user_id) do nothing;
  end if;
  return NEW;
end
$$;

drop trigger if exists trg_ensure_op_on_discussion on public.discussions;
create trigger trg_ensure_op_on_discussion
after insert on public.discussions
for each row
execute function public.trgfn_ensure_op_on_discussion();

-- View used by the UI (explicit columns to avoid remap errors)
drop view if exists public.v_messages_with_alias cascade;
create view public.v_messages_with_alias as
select
  m.id,
  m.room_id,
  m.profile_id,
  m.content,
  m.created_at,
  m.updated_at,
  m.is_deleted,
  m.flagged,
  m.discussion_id,
  m.parent_id,
  m.reply_to_message_id,
  da.is_op,
  da.alias,
  case when da.is_op then 'OP' else 'User ' || da.alias::text end as display_name
from public.messages m
left join public.discussion_aliases da
  on da.discussion_id = m.discussion_id
 and da.user_id       = m.profile_id;

grant select on public.v_messages_with_alias to anon, authenticated;

-- Admin view (optional; service role only)
create or replace view public.v_discussion_aliases_admin as
select discussion_id, user_id, alias, is_op, created_at
from public.discussion_aliases;

revoke all on public.v_discussion_aliases_admin from anon, authenticated;
grant select on public.v_discussion_aliases_admin to service_role;

-- RLS: read aliases if you can read the discussion
alter table public.discussion_aliases enable row level security;

drop policy if exists sel_discussion_aliases on public.discussion_aliases;
create policy sel_discussion_aliases on public.discussion_aliases
for select to authenticated
using (
  exists (
    select 1
    from public.discussions d
    join public.rooms r on r.id = d.room_id
    left join public.memberships ms
      on ms.room_id = r.id and ms.profile_id = auth.uid()
    where d.id = discussion_id
      and (coalesce(r.is_private,false) = false or ms.profile_id is not null)
  )
);

-- Refresh REST schema
select pg_notify('pgrst','reload schema');
