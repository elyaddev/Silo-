-- View used by the UI to show alias labels with each message
drop view if exists public.v_messages_with_alias cascade;

create view public.v_messages_with_alias as
select
  m.id,
  m.room_id,
  m.discussion_id,
  m.profile_id,
  m.parent_id,
  m.reply_to_message_id,
  m.content,
  m.created_at,
  m.updated_at,
  m.is_deleted,
  m.flagged,
  case
    when da.is_op then 'OP'
    when da.alias is not null then da.alias::text     -- '1','2',...
    else null
  end as alias_label
from public.messages m
left join public.discussion_aliases da
  on da.discussion_id = m.discussion_id
 and da.user_id       = m.profile_id;

grant select on public.v_messages_with_alias to anon, authenticated;
