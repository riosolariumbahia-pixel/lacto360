import { supabase } from "@/integrations/supabase/client";

export type AuditLog = {
  id: string;
  created_at: string;
  user_id: string | null;
  user_name: string | null;
  user_role: string | null;
  org_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

export type DeletedRecord = {
  table_name: string;
  id: string;
  label: string | null;
  deleted_at: string;
  deleted_by: string | null;
  deleted_by_name: string | null;
};

export const AUDIT_TABLES = [
  "customers", "sales_orders", "sales_order_items", "sales_commissions",
  "finance_entries", "finance_payments",
  "production_butter", "production_cheese",
  "inventory_items", "inventory_movements",
] as const;

export const SOFT_DELETE_TABLES = [
  "customers", "sales_orders", "finance_entries", "inventory_items",
] as const;
export type SoftDeleteTable = (typeof SOFT_DELETE_TABLES)[number];

export const auditApi = {
  async list(opts?: {
    from?: string;
    to?: string;
    user_id?: string;
    action?: "INSERT" | "UPDATE" | "DELETE";
    table_name?: string;
    limit?: number;
  }) {
    let q = supabase.from("audit_logs").select("*")
      .order("created_at", { ascending: false })
      .limit(opts?.limit ?? 200);
    if (opts?.from) q = q.gte("created_at", opts.from);
    if (opts?.to) q = q.lte("created_at", opts.to);
    if (opts?.user_id) q = q.eq("user_id", opts.user_id);
    if (opts?.action) q = q.eq("action", opts.action);
    if (opts?.table_name) q = q.eq("table_name", opts.table_name);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as AuditLog[];
  },

  async softDelete(table: SoftDeleteTable, id: string) {
    const { error } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    }).rpc("soft_delete", { _table: table, _id: id });
    if (error) throw new Error(error.message);
  },

  async restore(table: SoftDeleteTable, id: string) {
    const { error } = await (supabase as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
    }).rpc("restore_record", { _table: table, _id: id });
    if (error) throw new Error(error.message);
  },

  async listDeleted() {
    const { data, error } = await (supabase as unknown as {
      rpc: (fn: string) => Promise<{ data: DeletedRecord[] | null; error: { message: string } | null }>;
    }).rpc("list_deleted_records");
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};

export const TABLE_LABEL: Record<string, string> = {
  customers: "Clientes",
  sales_orders: "Pedidos de venda",
  sales_order_items: "Itens de pedido",
  sales_commissions: "Comissões",
  finance_entries: "Lançamentos financeiros",
  finance_payments: "Pagamentos",
  production_butter: "Produção – Manteiga",
  production_cheese: "Produção – Queijo",
  inventory_items: "Itens de estoque",
  inventory_movements: "Movimentações de estoque",
};