
-- ============================================================
-- FASE 2: hardening de RLS para produção, estoque e perfis
-- ============================================================

-- ---------- inventory_items ----------
DROP POLICY IF EXISTS "members read items" ON public.inventory_items;
CREATE POLICY "ops read items"
  ON public.inventory_items FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND (
      public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
      OR public.has_role(auth.uid(), org_id, 'op_manager'::public.app_role)
    )
  );

-- ---------- inventory_movements ----------
DROP POLICY IF EXISTS "members read movements" ON public.inventory_movements;
CREATE POLICY "ops read movements"
  ON public.inventory_movements FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND (
      public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
      OR public.has_role(auth.uid(), org_id, 'op_manager'::public.app_role)
    )
  );

DROP POLICY IF EXISTS "ops insert movements" ON public.inventory_movements;
CREATE POLICY "ops insert movements"
  ON public.inventory_movements FOR INSERT
  WITH CHECK (
    org_id = public.current_org_id()
    AND (
      public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
      OR public.has_role(auth.uid(), org_id, 'op_manager'::public.app_role)
    )
  );

-- ---------- production_butter ----------
DROP POLICY IF EXISTS "members read butter" ON public.production_butter;
CREATE POLICY "ops read butter"
  ON public.production_butter FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND (
      public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
      OR public.has_role(auth.uid(), org_id, 'op_manager'::public.app_role)
    )
  );

-- ---------- production_cheese ----------
DROP POLICY IF EXISTS "members read cheese" ON public.production_cheese;
CREATE POLICY "ops read cheese"
  ON public.production_cheese FOR SELECT
  USING (
    org_id = public.current_org_id()
    AND (
      public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
      OR public.has_role(auth.uid(), org_id, 'op_manager'::public.app_role)
    )
  );

-- ---------- profiles ----------
DROP POLICY IF EXISTS "view org members profiles" ON public.profiles;
CREATE POLICY "managers view org profiles"
  ON public.profiles FOR SELECT
  USING (
    id = auth.uid()
    OR (
      org_id = public.current_org_id()
      AND (
        public.has_role(auth.uid(), org_id, 'admin'::public.app_role)
        OR public.has_role(auth.uid(), org_id, 'sales_manager'::public.app_role)
        OR public.has_role(auth.uid(), org_id, 'op_manager'::public.app_role)
        OR public.has_role(auth.uid(), org_id, 'finance_manager'::public.app_role)
      )
    )
  );

-- ---------- Views seguras ----------

-- Catálogo de produtos sem custo, para qualquer membro da org (necessário para venda)
DROP VIEW IF EXISTS public.inventory_catalog;
CREATE VIEW public.inventory_catalog
WITH (security_invoker = on) AS
  SELECT
    i.id,
    i.org_id,
    i.name,
    i.sku,
    i.category,
    i.unit,
    i.sale_price,
    i.stock_qty,
    i.is_active
  FROM public.inventory_items i
  WHERE i.org_id = public.current_org_id()
    AND i.is_active = true;

-- A view roda como invoker; precisamos liberar SELECT via policy paralela
-- na tabela base APENAS através da view. Como security_invoker respeita RLS
-- da base, criamos uma policy adicional que permite leitura projetada quando
-- consultado via view. Para isso, simplesmente liberamos SELECT amplo com
-- limitação por org — mas isso reabriria leitura completa. Solução:
-- substituir a view por SECURITY DEFINER controlada.
DROP VIEW IF EXISTS public.inventory_catalog;
CREATE OR REPLACE FUNCTION public.list_inventory_catalog()
RETURNS TABLE (
  id uuid,
  org_id uuid,
  name text,
  sku text,
  category text,
  unit text,
  sale_price numeric,
  stock_qty numeric,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.org_id, i.name, i.sku, i.category, i.unit,
         i.sale_price, i.stock_qty, i.is_active
  FROM public.inventory_items i
  WHERE i.org_id = public.current_org_id()
    AND i.is_active = true;
$$;
GRANT EXECUTE ON FUNCTION public.list_inventory_catalog() TO authenticated;

-- Diretório de membros (apenas id + nome) para qualquer membro da org
CREATE OR REPLACE FUNCTION public.list_org_members_directory()
RETURNS TABLE (
  id uuid,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name
  FROM public.profiles p
  WHERE p.org_id = public.current_org_id();
$$;
GRANT EXECUTE ON FUNCTION public.list_org_members_directory() TO authenticated;
