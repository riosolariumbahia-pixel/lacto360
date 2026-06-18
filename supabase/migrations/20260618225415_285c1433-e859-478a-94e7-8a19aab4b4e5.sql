
-- ============ CRÍTICA-1: Invitations leakage ============
DROP POLICY IF EXISTS "anyone read invite by token" ON public.invitations;

-- Security definer function for the public invite landing page
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE (
  id uuid,
  email text,
  role public.app_role,
  expires_at timestamptz,
  accepted_at timestamptz,
  org_id uuid,
  org_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.email, i.role, i.expires_at, i.accepted_at, i.org_id, o.name AS org_name
  FROM public.invitations i
  JOIN public.organizations o ON o.id = i.org_id
  WHERE i.token = _token
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;

-- ============ BAIXA-9: validar e-mail no aceite ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_invite record;
  v_org_id uuid;
  v_role public.app_role;
  v_full_name text;
  v_company text;
  v_token text;
begin
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_company := coalesce(new.raw_user_meta_data->>'company_name', v_full_name || ' Laticínios');
  v_token := new.raw_user_meta_data->>'invite_token';

  if v_token is not null and length(v_token) > 0 then
    select * into v_invite from public.invitations
      where token = v_token
        and accepted_at is null
        and expires_at > now()
        and lower(email) = lower(new.email)
      limit 1;

    if v_invite.id is null then
      raise exception 'Convite inválido, expirado ou e-mail não corresponde ao convite.';
    end if;

    v_org_id := v_invite.org_id;
    v_role := v_invite.role;
    update public.invitations set accepted_at = now() where id = v_invite.id;
  else
    insert into public.organizations (name, owner_id)
    values (v_company, new.id)
    returning id into v_org_id;
    v_role := 'admin';
  end if;

  insert into public.profiles (id, org_id, full_name)
  values (new.id, v_org_id, v_full_name);

  insert into public.user_roles (user_id, org_id, role)
  values (new.id, v_org_id, v_role);

  return new;
end;
$$;

-- ============ ALTA-2: Customers per seller ============
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Backfill: assign existing customers to the organization's owner
UPDATE public.customers c
  SET owner_id = o.owner_id
  FROM public.organizations o
  WHERE c.org_id = o.id AND c.owner_id IS NULL;

-- Default owner_id to current user on insert
ALTER TABLE public.customers
  ALTER COLUMN owner_id SET DEFAULT auth.uid();

DROP POLICY IF EXISTS "members read customers" ON public.customers;
DROP POLICY IF EXISTS "sales manage customers" ON public.customers;

CREATE POLICY "read customers by role"
ON public.customers FOR SELECT
TO authenticated
USING (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'sales_manager'::public.app_role)
    OR (public.has_role(auth.uid(), org_id, 'seller'::public.app_role) AND owner_id = auth.uid())
  )
);

CREATE POLICY "insert customers by role"
ON public.customers FOR INSERT
TO authenticated
WITH CHECK (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'sales_manager'::public.app_role)
    OR (public.has_role(auth.uid(), org_id, 'seller'::public.app_role) AND owner_id = auth.uid())
  )
);

CREATE POLICY "update customers by role"
ON public.customers FOR UPDATE
TO authenticated
USING (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'sales_manager'::public.app_role)
    OR (public.has_role(auth.uid(), org_id, 'seller'::public.app_role) AND owner_id = auth.uid())
  )
)
WITH CHECK (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'sales_manager'::public.app_role)
    OR (public.has_role(auth.uid(), org_id, 'seller'::public.app_role) AND owner_id = auth.uid())
  )
);

CREATE POLICY "delete customers by role"
ON public.customers FOR DELETE
TO authenticated
USING (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'sales_manager'::public.app_role)
  )
);

-- ============ ALTA-3: Finance restricted ============
DROP POLICY IF EXISTS "members read finance categories" ON public.finance_categories;
CREATE POLICY "finance read categories"
ON public.finance_categories FOR SELECT
TO authenticated
USING (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'finance_manager'::public.app_role)
  )
);

DROP POLICY IF EXISTS "members read finance entries" ON public.finance_entries;
CREATE POLICY "finance read entries"
ON public.finance_entries FOR SELECT
TO authenticated
USING (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'finance_manager'::public.app_role)
  )
);

DROP POLICY IF EXISTS "members read finance payments" ON public.finance_payments;
DROP POLICY IF EXISTS "finance insert payments" ON public.finance_payments;
CREATE POLICY "finance read payments"
ON public.finance_payments FOR SELECT
TO authenticated
USING (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'finance_manager'::public.app_role)
  )
);
CREATE POLICY "finance insert payments"
ON public.finance_payments FOR INSERT
TO authenticated
WITH CHECK (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'finance_manager'::public.app_role)
  )
);

-- ============ ALTA-4: Commissions & targets restricted ============
DROP POLICY IF EXISTS "members read commissions" ON public.sales_commissions;
CREATE POLICY "read commissions by role"
ON public.sales_commissions FOR SELECT
TO authenticated
USING (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'sales_manager'::public.app_role)
    OR seller_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "members read targets" ON public.sales_targets;
CREATE POLICY "read targets by role"
ON public.sales_targets FOR SELECT
TO authenticated
USING (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'sales_manager'::public.app_role)
    OR seller_id = auth.uid()
  )
);

-- ============ Sales orders: remove op_manager from view ============
DROP POLICY IF EXISTS "view orders" ON public.sales_orders;
CREATE POLICY "view orders"
ON public.sales_orders FOR SELECT
TO authenticated
USING (
  org_id = public.current_org_id() AND (
    public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
    OR public.has_role(auth.uid(), org_id, 'sales_manager'::public.app_role)
    OR seller_id = auth.uid()
  )
);
