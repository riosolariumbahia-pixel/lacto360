GRANT EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.current_org_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) TO authenticated, anon;