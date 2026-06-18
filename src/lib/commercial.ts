import { supabase } from "@/integrations/supabase/client";

export type Customer = {
  id: string;
  org_id: string;
  name: string;
  doc: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  status: "ativo" | "inativo";
  credit_limit: number;
  payment_terms: string | null;
  notes: string | null;
  created_at: string;
};

export type OrderStatus = "rascunho" | "confirmado" | "em_rota" | "entregue" | "cancelado";
export type OrderChannel = "balcao" | "rota" | "whatsapp" | "distribuidor";

export type SalesOrder = {
  id: string;
  org_id: string;
  code: string;
  customer_id: string;
  seller_id: string;
  status: OrderStatus;
  channel: OrderChannel;
  subtotal: number;
  discount: number;
  total: number;
  notes: string | null;
  ordered_at: string;
  delivered_at: string | null;
  created_at: string;
};

export type SalesOrderItem = {
  id: string;
  order_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total: number;
};

export type SalesTarget = {
  id: string;
  org_id: string;
  seller_id: string;
  period: string;
  target_kg: number;
  target_brl: number;
};

export type SalesCommission = {
  id: string;
  org_id: string;
  seller_id: string;
  commission_percent: number;
};

export type SellerProfile = {
  id: string;
  full_name: string | null;
  role: "admin" | "sales_manager" | "seller" | "op_manager";
};

export const commercialApi = {
  // ---- Customers ----
  async listCustomers() {
    const { data, error } = await supabase
      .from("customers").select("*").order("name");
    if (error) throw error;
    return (data ?? []) as Customer[];
  },
  async createCustomer(orgId: string, p: Partial<Customer> & { name: string }) {
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await supabase.from("customers").insert({
      org_id: orgId,
      owner_id: auth.user?.id ?? null,
      name: p.name,
      doc: p.doc ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      city: p.city ?? null,
      state: p.state ?? null,
      status: p.status ?? "ativo",
      credit_limit: p.credit_limit ?? 0,
      payment_terms: p.payment_terms ?? null,
      notes: p.notes ?? null,
    });
    if (error) throw error;
  },
  async updateCustomer(id: string, p: Partial<Customer>) {
    const { error } = await supabase.from("customers").update(p).eq("id", id);
    if (error) throw error;
  },

  // ---- Sellers (profiles + roles) ----
  async listSellers(orgId: string): Promise<SellerProfile[]> {
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("org_id", orgId);
    if (error) throw error;
    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    if (ids.length === 0) return [];
    const { data: profiles } = await supabase
      .from("profiles").select("id, full_name").in("id", ids);
    const byId = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string | null]));
    return (roles ?? []).map((r) => ({
      id: r.user_id,
      full_name: byId.get(r.user_id) ?? null,
      role: r.role as SellerProfile["role"],
    }));
  },

  // ---- Orders ----
  async listOrders() {
    const { data, error } = await supabase
      .from("sales_orders").select("*")
      .order("ordered_at", { ascending: false }).limit(200);
    if (error) throw error;
    return (data ?? []) as SalesOrder[];
  },
  async listOrderItems(orderId: string) {
    const { data, error } = await supabase
      .from("sales_order_items").select("*").eq("order_id", orderId);
    if (error) throw error;
    return (data ?? []) as SalesOrderItem[];
  },
  async createOrder(orgId: string, payload: {
    customer_id: string;
    seller_id: string;
    channel: OrderChannel;
    discount: number;
    notes?: string | null;
    items: { item_id: string; quantity: number; unit_price: number }[];
    confirm: boolean;
  }) {
    const { data: order, error } = await supabase.from("sales_orders").insert({
      org_id: orgId,
      customer_id: payload.customer_id,
      seller_id: payload.seller_id,
      channel: payload.channel,
      discount: payload.discount,
      notes: payload.notes ?? null,
      status: "rascunho",
    }).select("*").single();
    if (error) throw error;
    if (payload.items.length > 0) {
      const { error: ie } = await supabase.from("sales_order_items").insert(
        payload.items.map((i) => ({
          order_id: order.id,
          item_id: i.item_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
        }))
      );
      if (ie) throw ie;
    }
    if (payload.confirm) {
      const { error: ue } = await supabase.from("sales_orders")
        .update({ status: "confirmado" }).eq("id", order.id);
      if (ue) throw ue;
    }
  },
  async updateOrderStatus(id: string, status: OrderStatus) {
    const { error } = await supabase.from("sales_orders").update({ status }).eq("id", id);
    if (error) throw error;
  },

  // ---- Targets ----
  async listTargets(period: string) {
    const { data, error } = await supabase
      .from("sales_targets").select("*").eq("period", period);
    if (error) throw error;
    return (data ?? []) as SalesTarget[];
  },
  async upsertTarget(orgId: string, p: { seller_id: string; period: string; target_kg: number; target_brl: number }) {
    const { error } = await supabase.from("sales_targets").upsert({
      org_id: orgId,
      seller_id: p.seller_id,
      period: p.period,
      target_kg: p.target_kg,
      target_brl: p.target_brl,
    }, { onConflict: "org_id,seller_id,period" });
    if (error) throw error;
  },

  // ---- Commissions ----
  async listCommissions() {
    const { data, error } = await supabase.from("sales_commissions").select("*");
    if (error) throw error;
    return (data ?? []) as SalesCommission[];
  },
  async upsertCommission(orgId: string, p: { seller_id: string; commission_percent: number }) {
    const { error } = await supabase.from("sales_commissions").upsert({
      org_id: orgId,
      seller_id: p.seller_id,
      commission_percent: p.commission_percent,
    }, { onConflict: "org_id,seller_id" });
    if (error) throw error;
  },
};

export function firstOfMonth(d = new Date()): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1)).toISOString().slice(0, 10);
}
