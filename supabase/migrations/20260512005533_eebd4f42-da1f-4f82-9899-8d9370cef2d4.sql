
-- ============== INVENTORY ITEMS ==============
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku text,
  category text not null default 'produto', -- produto | insumo | embalagem
  unit text not null default 'kg', -- kg | un | l
  cost_price numeric(12,2) not null default 0,
  sale_price numeric(12,2) not null default 0,
  stock_qty numeric(12,3) not null default 0,
  min_stock numeric(12,3) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_inventory_items_org on public.inventory_items(org_id);
alter table public.inventory_items enable row level security;

create trigger trg_inventory_items_updated
before update on public.inventory_items
for each row execute function public.tg_set_updated_at();

-- ============== INVENTORY MOVEMENTS ==============
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  movement_type text not null, -- in | out | adjust | loss | production
  quantity numeric(12,3) not null,
  unit_cost numeric(12,2),
  reference text,
  notes text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index idx_inventory_movements_org on public.inventory_movements(org_id);
create index idx_inventory_movements_item on public.inventory_movements(item_id);
alter table public.inventory_movements enable row level security;

-- trigger: auto-update stock
create or replace function public.tg_apply_inventory_movement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta numeric(12,3);
begin
  if new.movement_type in ('in','production') then
    v_delta := new.quantity;
  elsif new.movement_type in ('out','loss') then
    v_delta := -new.quantity;
  elsif new.movement_type = 'adjust' then
    v_delta := new.quantity; -- signed value
  else
    v_delta := 0;
  end if;

  update public.inventory_items
    set stock_qty = stock_qty + v_delta
    where id = new.item_id;

  return new;
end;
$$;

create trigger trg_apply_inventory_movement
after insert on public.inventory_movements
for each row execute function public.tg_apply_inventory_movement();

-- ============== PRODUCTION BUTTER ==============
create table public.production_butter (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  produced_at date not null default current_date,
  milk_liters numeric(12,3) not null default 0,
  butter_kg numeric(12,3) not null default 0,
  loss_kg numeric(12,3) not null default 0,
  yield_percent numeric(6,2) generated always as (
    case when milk_liters > 0 then (butter_kg / milk_liters * 100) else 0 end
  ) stored,
  total_cost numeric(12,2) not null default 0,
  output_item_id uuid references public.inventory_items(id),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_production_butter_org on public.production_butter(org_id);
alter table public.production_butter enable row level security;
create trigger trg_production_butter_updated
before update on public.production_butter
for each row execute function public.tg_set_updated_at();

-- ============== PRODUCTION CHEESE ==============
create table public.production_cheese (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  produced_at date not null default current_date,
  milk_liters numeric(12,3) not null default 0,
  cheese_kg numeric(12,3) not null default 0,
  pieces integer not null default 0,
  loss_kg numeric(12,3) not null default 0,
  yield_percent numeric(6,2) generated always as (
    case when milk_liters > 0 then (cheese_kg / milk_liters * 100) else 0 end
  ) stored,
  total_cost numeric(12,2) not null default 0,
  output_item_id uuid references public.inventory_items(id),
  notes text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_production_cheese_org on public.production_cheese(org_id);
alter table public.production_cheese enable row level security;
create trigger trg_production_cheese_updated
before update on public.production_cheese
for each row execute function public.tg_set_updated_at();

-- auto stock entry on production insert
create or replace function public.tg_production_to_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qty numeric(12,3);
begin
  if new.output_item_id is null then
    return new;
  end if;

  if tg_table_name = 'production_butter' then
    v_qty := new.butter_kg;
  else
    v_qty := new.cheese_kg;
  end if;

  if v_qty > 0 then
    insert into public.inventory_movements (org_id, item_id, movement_type, quantity, reference, created_by)
    values (new.org_id, new.output_item_id, 'production', v_qty,
            'Produção ' || tg_table_name || ' #' || new.id::text, new.created_by);
  end if;

  return new;
end;
$$;

create trigger trg_butter_to_stock
after insert on public.production_butter
for each row execute function public.tg_production_to_stock();

create trigger trg_cheese_to_stock
after insert on public.production_cheese
for each row execute function public.tg_production_to_stock();

-- ============== RLS POLICIES ==============
-- helper: write access = admin or op_manager
-- inventory_items
create policy "members read items"
on public.inventory_items for select
using (org_id = public.current_org_id());

create policy "ops manage items"
on public.inventory_items for all
using (
  org_id = public.current_org_id()
  and (public.has_role(auth.uid(), org_id, 'admin') or public.has_role(auth.uid(), org_id, 'op_manager'))
)
with check (
  org_id = public.current_org_id()
  and (public.has_role(auth.uid(), org_id, 'admin') or public.has_role(auth.uid(), org_id, 'op_manager'))
);

-- inventory_movements
create policy "members read movements"
on public.inventory_movements for select
using (org_id = public.current_org_id());

create policy "ops insert movements"
on public.inventory_movements for insert
with check (
  org_id = public.current_org_id()
  and (public.has_role(auth.uid(), org_id, 'admin') or public.has_role(auth.uid(), org_id, 'op_manager'))
);

create policy "admins delete movements"
on public.inventory_movements for delete
using (
  org_id = public.current_org_id()
  and public.has_role(auth.uid(), org_id, 'admin')
);

-- production_butter
create policy "members read butter"
on public.production_butter for select
using (org_id = public.current_org_id());

create policy "ops manage butter"
on public.production_butter for all
using (
  org_id = public.current_org_id()
  and (public.has_role(auth.uid(), org_id, 'admin') or public.has_role(auth.uid(), org_id, 'op_manager'))
)
with check (
  org_id = public.current_org_id()
  and (public.has_role(auth.uid(), org_id, 'admin') or public.has_role(auth.uid(), org_id, 'op_manager'))
);

-- production_cheese
create policy "members read cheese"
on public.production_cheese for select
using (org_id = public.current_org_id());

create policy "ops manage cheese"
on public.production_cheese for all
using (
  org_id = public.current_org_id()
  and (public.has_role(auth.uid(), org_id, 'admin') or public.has_role(auth.uid(), org_id, 'op_manager'))
)
with check (
  org_id = public.current_org_id()
  and (public.has_role(auth.uid(), org_id, 'admin') or public.has_role(auth.uid(), org_id, 'op_manager'))
);
