import { supabase } from "@/integrations/supabase/client";

export type InventoryItem = {
  id: string;
  org_id: string;
  name: string;
  sku: string | null;
  category: string;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_qty: number;
  min_stock: number;
  is_active: boolean;
};

export type InventoryMovement = {
  id: string;
  item_id: string;
  movement_type: "in" | "out" | "adjust" | "loss" | "production";
  quantity: number;
  unit_cost: number | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

export type ButterLot = {
  id: string;
  org_id: string;
  produced_at: string;
  milk_liters: number;
  butter_kg: number;
  loss_kg: number;
  yield_percent: number;
  total_cost: number;
  output_item_id: string | null;
  notes: string | null;
  created_at: string;
};

export type CheeseLot = {
  id: string;
  org_id: string;
  produced_at: string;
  milk_liters: number;
  cheese_kg: number;
  pieces: number;
  loss_kg: number;
  yield_percent: number;
  total_cost: number;
  output_item_id: string | null;
  notes: string | null;
  created_at: string;
};

export const operationsApi = {
  async listItems() {
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name");
    if (error) throw error;
    return (data ?? []) as InventoryItem[];
  },
  /**
   * Catálogo seguro: usado por vendedores (sem custo).
   * Chama RPC SECURITY DEFINER que só retorna itens ativos da org.
   */
  async listCatalog() {
    const { data, error } = await (supabase as unknown as {
      rpc: (fn: string) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    }).rpc("list_inventory_catalog");
    if (error) throw error;
    return ((data ?? []) as Array<Omit<InventoryItem, "cost_price" | "min_stock">>).map((d) => ({
      ...d,
      cost_price: 0,
      min_stock: 0,
    })) as InventoryItem[];
  },
  async createItem(orgId: string, payload: Partial<InventoryItem> & { name: string }) {
    const { error } = await supabase.from("inventory_items").insert({
      org_id: orgId,
      name: payload.name,
      sku: payload.sku ?? null,
      category: payload.category ?? "produto",
      unit: payload.unit ?? "kg",
      cost_price: payload.cost_price ?? 0,
      sale_price: payload.sale_price ?? 0,
      stock_qty: payload.stock_qty ?? 0,
      min_stock: payload.min_stock ?? 0,
    });
    if (error) throw error;
  },
  async addMovement(orgId: string, payload: {
    item_id: string;
    movement_type: InventoryMovement["movement_type"];
    quantity: number;
    unit_cost?: number | null;
    reference?: string | null;
    notes?: string | null;
  }) {
    const { error } = await supabase.from("inventory_movements").insert({
      org_id: orgId,
      ...payload,
    });
    if (error) throw error;
  },
  async listButter() {
    const { data, error } = await supabase
      .from("production_butter")
      .select("*")
      .order("produced_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data ?? []) as ButterLot[];
  },
  async createButter(orgId: string, payload: {
    produced_at: string;
    milk_liters: number;
    butter_kg: number;
    loss_kg: number;
    total_cost: number;
    output_item_id?: string | null;
    notes?: string | null;
  }) {
    const { error } = await supabase.from("production_butter").insert({
      org_id: orgId,
      ...payload,
    });
    if (error) throw error;
  },
  async listCheese() {
    const { data, error } = await supabase
      .from("production_cheese")
      .select("*")
      .order("produced_at", { ascending: false })
      .limit(60);
    if (error) throw error;
    return (data ?? []) as CheeseLot[];
  },
  async createCheese(orgId: string, payload: {
    produced_at: string;
    milk_liters: number;
    cheese_kg: number;
    pieces: number;
    loss_kg: number;
    total_cost: number;
    output_item_id?: string | null;
    notes?: string | null;
  }) {
    const { error } = await supabase.from("production_cheese").insert({
      org_id: orgId,
      ...payload,
    });
    if (error) throw error;
  },
};

export function fmtBRL(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function fmtNum(n: number, frac = 0) {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  });
}