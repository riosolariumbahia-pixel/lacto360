ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS billing_provider text;
CREATE TABLE public.stripe_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 environment text NOT NULL CHECK (environment IN ('sandbox','live')),
 stripe_subscription_id text NOT NULL,
 stripe_customer_id text NOT NULL,
 price_id text NOT NULL,
 status text NOT NULL,
 current_period_end timestamptz,
 cancel_at_period_end boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(environment, stripe_subscription_id)
);
GRANT SELECT ON public.stripe_subscriptions TO authenticated;
GRANT ALL ON public.stripe_subscriptions TO service_role;
ALTER TABLE public.stripe_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_admin_reads_billing ON public.stripe_subscriptions FOR SELECT TO authenticated USING (org_id = public.current_org_id() AND public.has_role(auth.uid(),org_id,'admin'));
CREATE INDEX stripe_subscription_org_env ON public.stripe_subscriptions(org_id,environment);
CREATE TABLE public.stripe_checkout_reservations (
 org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
 environment text NOT NULL CHECK(environment IN ('sandbox','live')),
 request_id uuid NOT NULL DEFAULT gen_random_uuid(),
 stripe_session_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(org_id,environment)
);
GRANT ALL ON public.stripe_checkout_reservations TO service_role;
ALTER TABLE public.stripe_checkout_reservations ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.reserve_stripe_checkout(_org uuid, _env text)
RETURNS SETOF public.stripe_checkout_reservations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF _env NOT IN ('sandbox','live') THEN RAISE EXCEPTION 'Invalid environment'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(_org::text || _env,0));
 INSERT INTO public.stripe_checkout_reservations(org_id,environment) VALUES(_org,_env)
 ON CONFLICT(org_id,environment) DO UPDATE SET request_id=gen_random_uuid(),stripe_session_id=NULL,created_at=now()
 WHERE stripe_checkout_reservations.created_at < now() - interval '24 hours';
 RETURN QUERY SELECT * FROM public.stripe_checkout_reservations WHERE org_id=_org AND environment=_env;
END $$;
REVOKE ALL ON FUNCTION public.reserve_stripe_checkout(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_stripe_checkout(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.tg_protect_org_plan()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF (NEW.plan IS DISTINCT FROM OLD.plan OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at OR NEW.billing_provider IS DISTINCT FROM OLD.billing_provider)
 AND coalesce(auth.role(),'') <> 'service_role' AND current_user NOT IN ('postgres','supabase_admin','service_role') THEN
 RAISE EXCEPTION 'Alteração de plano permitida apenas pelo servidor';
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION public.org_has_active_subscription(_org uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.organizations o WHERE o.id=_org AND (
 (o.billing_provider IS DISTINCT FROM 'stripe' AND (o.plan='pro' OR o.trial_ends_at>now()))
 OR (o.billing_provider='stripe' AND EXISTS(SELECT 1 FROM public.stripe_subscriptions s WHERE s.org_id=o.id AND s.environment='live' AND s.price_id='lacto360_pro_monthly'
 AND ((s.status IN ('active','trialing','past_due') AND (s.current_period_end IS NULL OR s.current_period_end>now())) OR (s.status='canceled' AND s.current_period_end>now()))))
 ));
$$;
REVOKE ALL ON FUNCTION public.org_has_active_subscription(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.org_has_active_subscription(uuid) TO authenticated,service_role;