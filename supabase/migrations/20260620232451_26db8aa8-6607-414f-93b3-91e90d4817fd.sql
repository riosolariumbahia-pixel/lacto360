
-- ============================================================
-- BLOCO 1: AUDIT LOGS + SOFT DELETE
-- ============================================================

-- 1) audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  user_id uuid,
  user_name text,
  user_role text,
  org_id uuid,
  action text NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb
);

GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read audit logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING (org_id = public.current_org_id()
         AND public.has_role(auth.uid(), org_id, 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS audit_logs_org_created_idx ON public.audit_logs (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_logs_table_idx ON public.audit_logs (table_name);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON public.audit_logs (user_id);

-- 2) Generic audit trigger function
CREATE OR REPLACE FUNCTION public.tg_audit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text;
  v_role text;
  v_org  uuid;
  v_rec  text;
  v_old  jsonb;
  v_new  jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_org := (v_old->>'org_id')::uuid;
    v_rec := COALESCE(v_old->>'id', '');
  ELSE
    v_new := to_jsonb(NEW);
    v_org := (v_new->>'org_id')::uuid;
    v_rec := COALESCE(v_new->>'id', '');
    IF TG_OP = 'UPDATE' THEN
      v_old := to_jsonb(OLD);
    END IF;
  END IF;

  SELECT full_name INTO v_name FROM public.profiles WHERE id = v_user;
  SELECT role::text INTO v_role FROM public.user_roles
   WHERE user_id = v_user AND org_id = v_org LIMIT 1;

  INSERT INTO public.audit_logs
    (user_id, user_name, user_role, org_id, action, table_name, record_id, old_data, new_data)
  VALUES
    (v_user, v_name, v_role, v_org, TG_OP, TG_TABLE_NAME, v_rec, v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END $$;

-- 3) Attach audit triggers
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'customers','sales_orders','sales_order_items','sales_commissions',
    'finance_entries','finance_payments',
    'production_butter','production_cheese',
    'inventory_items','inventory_movements'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%I ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I '
      'FOR EACH ROW EXECUTE FUNCTION public.tg_audit()', t, t);
  END LOOP;
END $$;

-- 4) Soft delete columns
ALTER TABLE public.customers       ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.customers       ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.sales_orders    ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.sales_orders    ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.finance_entries ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.finance_entries ADD COLUMN IF NOT EXISTS deleted_by uuid;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE public.inventory_items ADD COLUMN IF NOT EXISTS deleted_by uuid;

CREATE INDEX IF NOT EXISTS customers_deleted_idx       ON public.customers (deleted_at);
CREATE INDEX IF NOT EXISTS sales_orders_deleted_idx    ON public.sales_orders (deleted_at);
CREATE INDEX IF NOT EXISTS finance_entries_deleted_idx ON public.finance_entries (deleted_at);
CREATE INDEX IF NOT EXISTS inventory_items_deleted_idx ON public.inventory_items (deleted_at);

-- 5) RPC: soft delete (any role that already had UPDATE rights via RLS)
CREATE OR REPLACE FUNCTION public.soft_delete(_table text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF _table NOT IN ('customers','sales_orders','finance_entries','inventory_items') THEN
    RAISE EXCEPTION 'Tabela % não suporta soft delete', _table;
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = now(), deleted_by = auth.uid() WHERE id = $1 AND deleted_at IS NULL',
    _table) USING _id;
END $$;

-- 6) RPC: restore (admin only)
CREATE OR REPLACE FUNCTION public.restore_record(_table text, _id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  IF _table NOT IN ('customers','sales_orders','finance_entries','inventory_items') THEN
    RAISE EXCEPTION 'Tabela % não suporta restauração', _table;
  END IF;
  EXECUTE format('SELECT org_id FROM public.%I WHERE id = $1', _table)
    INTO v_org USING _id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Registro não encontrado';
  END IF;
  IF NOT public.has_role(auth.uid(), v_org, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem restaurar registros';
  END IF;
  EXECUTE format(
    'UPDATE public.%I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1',
    _table) USING _id;
END $$;

-- 7) RPC: list deleted (admin only) — returns minimal info per table
CREATE OR REPLACE FUNCTION public.list_deleted_records()
RETURNS TABLE(
  table_name text,
  id uuid,
  label text,
  deleted_at timestamptz,
  deleted_by uuid,
  deleted_by_name text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'customers'::text, c.id, c.name,
         c.deleted_at, c.deleted_by, p.full_name
    FROM public.customers c
    LEFT JOIN public.profiles p ON p.id = c.deleted_by
   WHERE c.org_id = public.current_org_id()
     AND c.deleted_at IS NOT NULL
     AND public.has_role(auth.uid(), c.org_id, 'admin'::public.app_role)
  UNION ALL
  SELECT 'sales_orders', o.id, o.code,
         o.deleted_at, o.deleted_by, p.full_name
    FROM public.sales_orders o
    LEFT JOIN public.profiles p ON p.id = o.deleted_by
   WHERE o.org_id = public.current_org_id()
     AND o.deleted_at IS NOT NULL
     AND public.has_role(auth.uid(), o.org_id, 'admin'::public.app_role)
  UNION ALL
  SELECT 'finance_entries', f.id, COALESCE(f.description, f.id::text),
         f.deleted_at, f.deleted_by, p.full_name
    FROM public.finance_entries f
    LEFT JOIN public.profiles p ON p.id = f.deleted_by
   WHERE f.org_id = public.current_org_id()
     AND f.deleted_at IS NOT NULL
     AND public.has_role(auth.uid(), f.org_id, 'admin'::public.app_role)
  UNION ALL
  SELECT 'inventory_items', i.id, i.name,
         i.deleted_at, i.deleted_by, p.full_name
    FROM public.inventory_items i
    LEFT JOIN public.profiles p ON p.id = i.deleted_by
   WHERE i.org_id = public.current_org_id()
     AND i.deleted_at IS NOT NULL
     AND public.has_role(auth.uid(), i.org_id, 'admin'::public.app_role)
  ORDER BY 4 DESC;
$$;
