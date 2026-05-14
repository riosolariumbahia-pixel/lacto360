
-- ============ Categorias ============
CREATE TABLE public.finance_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('receita','despesa')),
  color text NOT NULL DEFAULT '#64748b',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, name, kind)
);

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read finance categories" ON public.finance_categories
  FOR SELECT USING (org_id = current_org_id());
CREATE POLICY "finance manage categories" ON public.finance_categories
  FOR ALL USING (
    org_id = current_org_id() AND
    (has_role(auth.uid(), org_id, 'admin') OR has_role(auth.uid(), org_id, 'finance_manager'))
  ) WITH CHECK (
    org_id = current_org_id() AND
    (has_role(auth.uid(), org_id, 'admin') OR has_role(auth.uid(), org_id, 'finance_manager'))
  );

CREATE TRIGGER tg_fin_cat_updated BEFORE UPDATE ON public.finance_categories
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ Lançamentos ============
CREATE TABLE public.finance_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('receivable','payable')),
  category_id uuid REFERENCES public.finance_categories(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  supplier_name text,
  description text NOT NULL,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  paid_amount numeric(12,2) NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  paid_at timestamptz,
  payment_method text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','parcial','pago','cancelado')),
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fin_entries_org_due ON public.finance_entries (org_id, due_date);
CREATE INDEX idx_fin_entries_org_status ON public.finance_entries (org_id, status);
CREATE INDEX idx_fin_entries_order ON public.finance_entries (order_id);

ALTER TABLE public.finance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read finance entries" ON public.finance_entries
  FOR SELECT USING (org_id = current_org_id());
CREATE POLICY "finance manage entries" ON public.finance_entries
  FOR ALL USING (
    org_id = current_org_id() AND
    (has_role(auth.uid(), org_id, 'admin') OR has_role(auth.uid(), org_id, 'finance_manager'))
  ) WITH CHECK (
    org_id = current_org_id() AND
    (has_role(auth.uid(), org_id, 'admin') OR has_role(auth.uid(), org_id, 'finance_manager'))
  );

CREATE TRIGGER tg_fin_entries_updated BEFORE UPDATE ON public.finance_entries
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ============ Pagamentos ============
CREATE TABLE public.finance_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  entry_id uuid NOT NULL REFERENCES public.finance_entries(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  paid_at timestamptz NOT NULL DEFAULT now(),
  method text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fin_payments_entry ON public.finance_payments (entry_id);

ALTER TABLE public.finance_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read finance payments" ON public.finance_payments
  FOR SELECT USING (org_id = current_org_id());
CREATE POLICY "finance insert payments" ON public.finance_payments
  FOR INSERT WITH CHECK (
    org_id = current_org_id() AND
    (has_role(auth.uid(), org_id, 'admin') OR has_role(auth.uid(), org_id, 'finance_manager'))
  );
CREATE POLICY "finance delete payments" ON public.finance_payments
  FOR DELETE USING (
    org_id = current_org_id() AND
    (has_role(auth.uid(), org_id, 'admin') OR has_role(auth.uid(), org_id, 'finance_manager'))
  );

-- Trigger: atualiza paid_amount/status do entry após payment
CREATE OR REPLACE FUNCTION public.tg_apply_finance_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_entry public.finance_entries;
BEGIN
  SELECT * INTO v_entry FROM public.finance_entries WHERE id = NEW.entry_id;
  IF v_entry.id IS NULL THEN RETURN NEW; END IF;

  UPDATE public.finance_entries SET
    paid_amount = paid_amount + NEW.amount,
    status = CASE
      WHEN status = 'cancelado' THEN status
      WHEN paid_amount + NEW.amount >= amount THEN 'pago'
      ELSE 'parcial'
    END,
    paid_at = CASE
      WHEN paid_amount + NEW.amount >= amount THEN NEW.paid_at
      ELSE paid_at
    END,
    payment_method = COALESCE(NEW.method, payment_method)
  WHERE id = NEW.entry_id;

  RETURN NEW;
END $$;

CREATE TRIGGER tg_apply_payment AFTER INSERT ON public.finance_payments
  FOR EACH ROW EXECUTE FUNCTION public.tg_apply_finance_payment();

-- Trigger: pedido confirmado -> gera receivable; cancelado -> cancela receivable
CREATE OR REPLACE FUNCTION public.tg_order_to_receivable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cat_id uuid;
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status = 'rascunho' AND NEW.status IN ('confirmado','em_rota','entregue')) THEN
    -- Evitar duplicação
    IF NOT EXISTS (SELECT 1 FROM public.finance_entries WHERE order_id = NEW.id AND kind = 'receivable') THEN
      SELECT id INTO v_cat_id FROM public.finance_categories
        WHERE org_id = NEW.org_id AND kind = 'receita' AND name = 'Vendas' LIMIT 1;

      INSERT INTO public.finance_entries
        (org_id, kind, category_id, customer_id, order_id, description, amount, due_date, created_by)
      VALUES
        (NEW.org_id, 'receivable', v_cat_id, NEW.customer_id, NEW.id,
         'Pedido ' || NEW.code, NEW.total, (NEW.ordered_at::date + INTERVAL '30 days')::date, NEW.seller_id);
    END IF;
  END IF;

  IF (TG_OP = 'UPDATE' AND NEW.status = 'cancelado' AND OLD.status <> 'cancelado') THEN
    UPDATE public.finance_entries
      SET status = 'cancelado'
      WHERE order_id = NEW.id AND kind = 'receivable' AND status <> 'pago';
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER tg_order_receivable AFTER UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.tg_order_to_receivable();

-- ============ Seed de categorias para novas orgs ============
CREATE OR REPLACE FUNCTION public.tg_seed_finance_categories()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.finance_categories (org_id, name, kind, color) VALUES
    (NEW.id, 'Vendas', 'receita', '#10b981'),
    (NEW.id, 'Outras receitas', 'receita', '#22c55e'),
    (NEW.id, 'Matéria-prima (leite)', 'despesa', '#ef4444'),
    (NEW.id, 'Embalagens', 'despesa', '#f97316'),
    (NEW.id, 'Energia', 'despesa', '#eab308'),
    (NEW.id, 'Salários', 'despesa', '#8b5cf6'),
    (NEW.id, 'Transporte', 'despesa', '#06b6d4'),
    (NEW.id, 'Impostos', 'despesa', '#64748b'),
    (NEW.id, 'Outros', 'despesa', '#94a3b8');
  RETURN NEW;
END $$;

CREATE TRIGGER tg_org_seed_finance AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.tg_seed_finance_categories();

-- Seed para orgs já existentes
INSERT INTO public.finance_categories (org_id, name, kind, color)
SELECT o.id, c.name, c.kind, c.color
FROM public.organizations o
CROSS JOIN (VALUES
  ('Vendas','receita','#10b981'),
  ('Outras receitas','receita','#22c55e'),
  ('Matéria-prima (leite)','despesa','#ef4444'),
  ('Embalagens','despesa','#f97316'),
  ('Energia','despesa','#eab308'),
  ('Salários','despesa','#8b5cf6'),
  ('Transporte','despesa','#06b6d4'),
  ('Impostos','despesa','#64748b'),
  ('Outros','despesa','#94a3b8')
) AS c(name, kind, color)
ON CONFLICT (org_id, name, kind) DO NOTHING;

REVOKE EXECUTE ON FUNCTION public.tg_apply_finance_payment() FROM public;
REVOKE EXECUTE ON FUNCTION public.tg_order_to_receivable() FROM public;
REVOKE EXECUTE ON FUNCTION public.tg_seed_finance_categories() FROM public;
