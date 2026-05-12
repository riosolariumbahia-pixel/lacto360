
revoke execute on function public.has_role(uuid, uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.current_org_id() from public, anon, authenticated;
revoke execute on function public.is_org_member(uuid, uuid) from public, anon, authenticated;
