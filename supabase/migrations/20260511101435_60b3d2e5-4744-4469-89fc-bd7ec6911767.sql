
alter function public.tg_set_updated_at() set search_path = public;

revoke execute on function public.has_role(uuid, uuid, public.app_role) from public, anon;
revoke execute on function public.current_org_id() from public, anon;
revoke execute on function public.is_org_member(uuid, uuid) from public, anon;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.tg_set_updated_at() from public, anon, authenticated;

grant execute on function public.has_role(uuid, uuid, public.app_role) to authenticated;
grant execute on function public.current_org_id() to authenticated;
grant execute on function public.is_org_member(uuid, uuid) to authenticated;
