CREATE OR REPLACE FUNCTION public.tg_protect_org_plan()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (NEW.plan IS DISTINCT FROM OLD.plan OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at)
     AND coalesce(auth.role(), '') <> 'service_role' AND current_user NOT IN ('postgres','supabase_admin','service_role') THEN
    RAISE EXCEPTION 'Alteração de plano permitida apenas pelo servidor';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS protect_org_plan ON public.organizations;
CREATE TRIGGER protect_org_plan BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.tg_protect_org_plan();

CREATE OR REPLACE FUNCTION public.org_has_active_subscription(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = _org
    AND (o.plan = 'pro' OR o.trial_ends_at > now()));
$$;
GRANT EXECUTE ON FUNCTION public.org_has_active_subscription(uuid) TO authenticated;