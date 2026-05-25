
CREATE OR REPLACE FUNCTION public.tg_seed_inventory_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.inventory_items (org_id, name, category, unit, sale_price, cost_price, min_stock)
  VALUES
    (NEW.id, 'Manteiga', 'produto', 'kg', 55.00, 30.00, 5),
    (NEW.id, 'Queijo Coalho', 'produto', 'kg', 48.00, 28.00, 5),
    (NEW.id, 'Queijo Mussarela', 'produto', 'kg', 42.00, 25.00, 5),
    (NEW.id, 'Queijo Minas Frescal', 'produto', 'kg', 38.00, 22.00, 5),
    (NEW.id, 'Queijo Manteiga', 'produto', 'kg', 50.00, 28.00, 5),
    (NEW.id, 'Requeijão', 'produto', 'kg', 35.00, 18.00, 3),
    (NEW.id, 'Iogurte Natural', 'produto', 'L', 12.00, 6.00, 10),
    (NEW.id, 'Bebida Láctea', 'produto', 'L', 8.00, 4.00, 10),
    (NEW.id, 'Leite Pasteurizado', 'produto', 'L', 6.00, 3.50, 20),
    (NEW.id, 'Leite Cru', 'insumo', 'L', 0, 2.50, 100),
    (NEW.id, 'Embalagem Plástica', 'embalagem', 'un', 0, 0.40, 100),
    (NEW.id, 'Embalagem a Vácuo', 'embalagem', 'un', 0, 0.80, 100);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_seed_inventory_items ON public.organizations;
CREATE TRIGGER trg_seed_inventory_items
AFTER INSERT ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.tg_seed_inventory_items();

-- Backfill existing organizations that have no inventory yet
INSERT INTO public.inventory_items (org_id, name, category, unit, sale_price, cost_price, min_stock)
SELECT o.id, v.name, v.category, v.unit, v.sale_price, v.cost_price, v.min_stock
FROM public.organizations o
CROSS JOIN (VALUES
  ('Manteiga', 'produto', 'kg', 55.00, 30.00, 5),
  ('Queijo Coalho', 'produto', 'kg', 48.00, 28.00, 5),
  ('Queijo Mussarela', 'produto', 'kg', 42.00, 25.00, 5),
  ('Queijo Minas Frescal', 'produto', 'kg', 38.00, 22.00, 5),
  ('Queijo Manteiga', 'produto', 'kg', 50.00, 28.00, 5),
  ('Requeijão', 'produto', 'kg', 35.00, 18.00, 3),
  ('Iogurte Natural', 'produto', 'L', 12.00, 6.00, 10),
  ('Bebida Láctea', 'produto', 'L', 8.00, 4.00, 10),
  ('Leite Pasteurizado', 'produto', 'L', 6.00, 3.50, 20),
  ('Leite Cru', 'insumo', 'L', 0, 2.50, 100),
  ('Embalagem Plástica', 'embalagem', 'un', 0, 0.40, 100),
  ('Embalagem a Vácuo', 'embalagem', 'un', 0, 0.80, 100)
) AS v(name, category, unit, sale_price, cost_price, min_stock)
WHERE NOT EXISTS (
  SELECT 1 FROM public.inventory_items i WHERE i.org_id = o.id
);
