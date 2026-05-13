
-- Add sales_manager and seller roles if not present (already in enum from phase 0)

-- ===== CUSTOMERS =====
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  doc text,
  email text,
  phone text,
  city text,
  state text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  credit_limit numeric(12,2) NOT NULL DEFAULT 0,
  payment_terms text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_customers_org ON public.customers(org_id);
CREATE INDEX idx_customers_org_status ON public.customers(org_id, status);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read customers" ON public.customers
  FOR SELECT USING (org_id = current_org_id());
CREATE POLICY "sales manage customers" ON public.customers
  FOR ALL USING (
    org_id = current_org_id() AND (
      has_role(auth.uid(), org_id, 'admin'::app_role)
      OR has_role(auth.uid(), org_id, 'sales_manager'::app_role)
    )
  ) WITH CHECK (
    org_id = current_org_id() AND (
      has_role(auth.uid(), org_id, 'admin'::app_role)
      OR has_role(auth.uid(), org_id, 'sales_manager'::app_role)
    )
  );

CREATE TRIGGER set_updated_at_customers BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== SALES ORDERS =====
CREATE SEQUENCE public.sales_order_code_seq;

CREATE TABLE public.sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  code text NOT NULL DEFAULT ('PED-' || lpad(nextval('public.sales_order_code_seq')::text, 6, '0')),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  seller_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','confirmado','em_rota','entregue','cancelado')),
  channel text NOT NULL DEFAULT 'balcao' CHECK (channel IN ('balcao','rota','whatsapp','distribuidor')),
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  ordered_at timestamptz NOT NULL DEFAULT now(),
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_org ON public.sales_orders(org_id);
CREATE INDEX idx_orders_seller ON public.sales_orders(org_id, seller_id);
CREATE INDEX idx_orders_customer ON public.sales_orders(customer_id);

ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view orders" ON public.sales_orders
  FOR SELECT USING (
    org_id = current_org_id() AND (
      has_role(auth.uid(), org_id, 'admin'::app_role)
      OR has_role(auth.uid(), org_id, 'sales_manager'::app_role)
      OR has_role(auth.uid(), org_id, 'op_manager'::app_role)
      OR seller_id = auth.uid()
    )
  );

CREATE POLICY "insert orders" ON public.sales_orders
  FOR INSERT WITH CHECK (
    org_id = current_org_id() AND (
      has_role(auth.uid(), org_id, 'admin'::app_role)
      OR has_role(auth.uid(), org_id, 'sales_manager'::app_role)
      OR (has_role(auth.uid(), org_id, 'seller'::app_role) AND seller_id = auth.uid())
    )
  );

CREATE POLICY "update orders" ON public.sales_orders
  FOR UPDATE USING (
    org_id = current_org_id() AND (
      has_role(auth.uid(), org_id, 'admin'::app_role)
      OR has_role(auth.uid(), org_id, 'sales_manager'::app_role)
      OR (has_role(auth.uid(), org_id, 'seller'::app_role) AND seller_id = auth.uid())
    )
  );

CREATE POLICY "admin delete orders" ON public.sales_orders
  FOR DELETE USING (
    org_id = current_org_id() AND has_role(auth.uid(), org_id, 'admin'::app_role)
  );

CREATE TRIGGER set_updated_at_orders BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== SALES ORDER ITEMS =====
CREATE TABLE public.sales_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  quantity numeric(12,3) NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON public.sales_order_items(order_id);

ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "view order items" ON public.sales_order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = order_id
      AND o.org_id = current_org_id()
      AND (
        has_role(auth.uid(), o.org_id, 'admin'::app_role)
        OR has_role(auth.uid(), o.org_id, 'sales_manager'::app_role)
        OR has_role(auth.uid(), o.org_id, 'op_manager'::app_role)
        OR o.seller_id = auth.uid()
      )
    )
  );

CREATE POLICY "manage order items" ON public.sales_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = order_id
      AND o.org_id = current_org_id()
      AND (
        has_role(auth.uid(), o.org_id, 'admin'::app_role)
        OR has_role(auth.uid(), o.org_id, 'sales_manager'::app_role)
        OR (has_role(auth.uid(), o.org_id, 'seller'::app_role) AND o.seller_id = auth.uid())
      )
    )
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.sales_orders o WHERE o.id = order_id
      AND o.org_id = current_org_id()
      AND (
        has_role(auth.uid(), o.org_id, 'admin'::app_role)
        OR has_role(auth.uid(), o.org_id, 'sales_manager'::app_role)
        OR (has_role(auth.uid(), o.org_id, 'seller'::app_role) AND o.seller_id = auth.uid())
      )
    )
  );

-- Recalculate order totals
CREATE OR REPLACE FUNCTION public.tg_recalc_order_total()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_order_id uuid;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  UPDATE public.sales_orders
    SET subtotal = COALESCE((SELECT SUM(total) FROM public.sales_order_items WHERE order_id = v_order_id), 0),
        total = GREATEST(COALESCE((SELECT SUM(total) FROM public.sales_order_items WHERE order_id = v_order_id), 0) - discount, 0)
    WHERE id = v_order_id;
  RETURN NULL;
END $$;
REVOKE EXECUTE ON FUNCTION public.tg_recalc_order_total() FROM PUBLIC;

CREATE TRIGGER trg_recalc_order_total
AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_items
FOR EACH ROW EXECUTE FUNCTION public.tg_recalc_order_total();

-- Stock movement on status change
CREATE OR REPLACE FUNCTION public.tg_order_stock_sync()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  -- Confirming: deduct stock
  IF (TG_OP = 'UPDATE' AND OLD.status = 'rascunho' AND NEW.status IN ('confirmado','em_rota','entregue')) THEN
    FOR r IN SELECT item_id, quantity FROM public.sales_order_items WHERE order_id = NEW.id LOOP
      INSERT INTO public.inventory_movements (org_id, item_id, movement_type, quantity, reference, created_by)
      VALUES (NEW.org_id, r.item_id, 'out', r.quantity, 'Pedido ' || NEW.code, NEW.seller_id);
    END LOOP;
  END IF;

  -- Cancelling a previously confirmed order: restock
  IF (TG_OP = 'UPDATE' AND OLD.status IN ('confirmado','em_rota','entregue') AND NEW.status = 'cancelado') THEN
    FOR r IN SELECT item_id, quantity FROM public.sales_order_items WHERE order_id = NEW.id LOOP
      INSERT INTO public.inventory_movements (org_id, item_id, movement_type, quantity, reference, created_by)
      VALUES (NEW.org_id, r.item_id, 'in', r.quantity, 'Estorno pedido ' || NEW.code, NEW.seller_id);
    END LOOP;
  END IF;

  -- Mark delivered_at when entering 'entregue'
  IF (TG_OP = 'UPDATE' AND NEW.status = 'entregue' AND OLD.status <> 'entregue') THEN
    NEW.delivered_at := now();
  END IF;

  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.tg_order_stock_sync() FROM PUBLIC;

CREATE TRIGGER trg_order_stock_sync
BEFORE UPDATE ON public.sales_orders
FOR EACH ROW EXECUTE FUNCTION public.tg_order_stock_sync();

-- ===== TARGETS =====
CREATE TABLE public.sales_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  period date NOT NULL,
  target_kg numeric(12,3) NOT NULL DEFAULT 0,
  target_brl numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, seller_id, period)
);
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read targets" ON public.sales_targets
  FOR SELECT USING (org_id = current_org_id());
CREATE POLICY "sales manage targets" ON public.sales_targets
  FOR ALL USING (
    org_id = current_org_id() AND (
      has_role(auth.uid(), org_id, 'admin'::app_role)
      OR has_role(auth.uid(), org_id, 'sales_manager'::app_role)
    )
  ) WITH CHECK (
    org_id = current_org_id() AND (
      has_role(auth.uid(), org_id, 'admin'::app_role)
      OR has_role(auth.uid(), org_id, 'sales_manager'::app_role)
    )
  );
CREATE TRIGGER set_updated_at_targets BEFORE UPDATE ON public.sales_targets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ===== COMMISSIONS =====
CREATE TABLE public.sales_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  commission_percent numeric(5,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, seller_id)
);
ALTER TABLE public.sales_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members read commissions" ON public.sales_commissions
  FOR SELECT USING (org_id = current_org_id());
CREATE POLICY "sales manage commissions" ON public.sales_commissions
  FOR ALL USING (
    org_id = current_org_id() AND (
      has_role(auth.uid(), org_id, 'admin'::app_role)
      OR has_role(auth.uid(), org_id, 'sales_manager'::app_role)
    )
  ) WITH CHECK (
    org_id = current_org_id() AND (
      has_role(auth.uid(), org_id, 'admin'::app_role)
      OR has_role(auth.uid(), org_id, 'sales_manager'::app_role)
    )
  );
CREATE TRIGGER set_updated_at_commissions BEFORE UPDATE ON public.sales_commissions
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
