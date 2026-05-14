import { supabase } from "@/integrations/supabase/client";

export type FinanceCategoryKind = "receita" | "despesa";
export type FinanceEntryKind = "receivable" | "payable";
export type FinanceEntryStatus = "pendente" | "parcial" | "pago" | "cancelado";

export type FinanceCategory = {
  id: string;
  org_id: string;
  name: string;
  kind: FinanceCategoryKind;
  color: string;
  is_active: boolean;
};

export type FinanceEntry = {
  id: string;
  org_id: string;
  kind: FinanceEntryKind;
  category_id: string | null;
  customer_id: string | null;
  order_id: string | null;
  supplier_name: string | null;
  description: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  paid_at: string | null;
  payment_method: string | null;
  status: FinanceEntryStatus;
  notes: string | null;
  created_at: string;
};

export type FinancePayment = {
  id: string;
  org_id: string;
  entry_id: string;
  amount: number;
  paid_at: string;
  method: string | null;
  notes: string | null;
};

export const financeApi = {
  async listCategories() {
    const { data, error } = await supabase
      .from("finance_categories").select("*").eq("is_active", true).order("name");
    if (error) throw error;
    return (data ?? []) as FinanceCategory[];
  },
  async createCategory(orgId: string, p: { name: string; kind: FinanceCategoryKind; color?: string }) {
    const { error } = await supabase.from("finance_categories").insert({
      org_id: orgId, name: p.name, kind: p.kind, color: p.color ?? "#64748b",
    });
    if (error) throw error;
  },
  async toggleCategory(id: string, is_active: boolean) {
    const { error } = await supabase.from("finance_categories").update({ is_active }).eq("id", id);
    if (error) throw error;
  },

  async listEntries(opts?: { kind?: FinanceEntryKind; from?: string; to?: string }) {
    let q = supabase.from("finance_entries").select("*")
      .order("due_date", { ascending: true }).limit(500);
    if (opts?.kind) q = q.eq("kind", opts.kind);
    if (opts?.from) q = q.gte("due_date", opts.from);
    if (opts?.to) q = q.lte("due_date", opts.to);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as FinanceEntry[];
  },
  async createEntry(orgId: string, p: {
    kind: FinanceEntryKind;
    description: string;
    amount: number;
    due_date: string;
    category_id?: string | null;
    supplier_name?: string | null;
    customer_id?: string | null;
    notes?: string | null;
  }) {
    const { error } = await supabase.from("finance_entries").insert({
      org_id: orgId,
      kind: p.kind,
      description: p.description,
      amount: p.amount,
      due_date: p.due_date,
      category_id: p.category_id ?? null,
      supplier_name: p.supplier_name ?? null,
      customer_id: p.customer_id ?? null,
      notes: p.notes ?? null,
    });
    if (error) throw error;
  },
  async cancelEntry(id: string) {
    const { error } = await supabase.from("finance_entries")
      .update({ status: "cancelado" }).eq("id", id);
    if (error) throw error;
  },

  async listPayments(entryId?: string) {
    let q = supabase.from("finance_payments").select("*").order("paid_at", { ascending: false });
    if (entryId) q = q.eq("entry_id", entryId);
    const { data, error } = await q;
    if (error) throw error;
    return (data ?? []) as FinancePayment[];
  },
  async registerPayment(orgId: string, p: {
    entry_id: string; amount: number; method?: string | null; notes?: string | null;
    paid_at?: string;
  }) {
    const { error } = await supabase.from("finance_payments").insert({
      org_id: orgId,
      entry_id: p.entry_id,
      amount: p.amount,
      method: p.method ?? null,
      notes: p.notes ?? null,
      paid_at: p.paid_at ?? new Date().toISOString(),
    });
    if (error) throw error;
  },
};

export function isOverdue(e: FinanceEntry) {
  if (e.status === "pago" || e.status === "cancelado") return false;
  return new Date(e.due_date) < new Date(new Date().toDateString());
}

export function entryRemaining(e: FinanceEntry) {
  return Math.max(0, Number(e.amount) - Number(e.paid_amount));
}

export function statusLabel(e: FinanceEntry): { label: string; tone: "ok" | "warn" | "danger" | "muted" } {
  if (e.status === "pago") return { label: "Pago", tone: "ok" };
  if (e.status === "cancelado") return { label: "Cancelado", tone: "muted" };
  if (isOverdue(e)) return { label: "Vencido", tone: "danger" };
  if (e.status === "parcial") return { label: "Parcial", tone: "warn" };
  return { label: "Pendente", tone: "warn" };
}
