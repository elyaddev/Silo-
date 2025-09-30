-- Replace recursive SELECT policy with a simple self policy
drop policy if exists "memberships_select_self_room" on public.memberships;

create policy "memberships_select_own" on public.memberships
for select
using (profile_id = auth.uid());
