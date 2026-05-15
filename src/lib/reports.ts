import { supabase } from "@/integrations/supabase/client";

export type Period = 7 | 30 | 90 | 365;

export type ExecutiveKPIs = {
  faturamento: number;
  despesas: number;
  lucro: number;
  margem: number;
  ticketMedio: number;
  pedidos: number;
  clientesAtivos: number;
  rendimentoMedio: number;
  aReceber: number;
  aPagar: number;
  vencidos: number;
};

export type MonthBucket = { mes: string; receita: number; despesa: number; lucro: number };
export type YieldPoint = { dia: string; rendimento: number };
export type ChannelSlice = { name: string; value: number };
export type RankRow = { name: string; value: number };

function startISO(period: Period) {
  return new Date(Date.now() - period * 86400000).toISOString();
}
function startDate(period: Period) {
  return startISO(period).slice(0, 10);
}

export const reportsApi = {
  async executive(period: Period): Promise<ExecutiveKPIs> {
    const sinceISO = startISO(period);
    const sinceD = startDate(period);

    const [orders, entries, customers, butter, cheese] = await Promise.all([
      supabase.from("sales_orders").select("total, status").gte("ordered_at", sinceISO).limit(1000),
      supabase.from("finance_entries").select("kind, amount, paid_amount, status, due_date").gte("due_date", sinceD).limit(1000),
      supabase.from("customers").select("id, status"),
      supabase.from("production_butter").select("yield_percent").gte("produced_at", sinceD).limit(500),
      supabase.from("production_cheese").select("yield_percent").gte("produced_at", sinceD).limit(500),
    ]);

    const ord = (orders.data ?? []).filter((o: any) => o.status !== "cancelado");
    const faturamento = ord.reduce((s: number, o: any) => s + Number(o.total), 0);
    const pedidos = ord.length;
    const ent = entries.data ?? [];
    const recv = ent.filter((e: any) => e.kind === "receivable" && e.status !== "cancelado");
    const pay = ent.filter((e: any) => e.kind === "payable" && e.status !== "cancelado");
    const despesas = pay.reduce((s: number, e: any) => s + Number(e.paid_amount), 0);
    const aReceber = recv.reduce((s: number, e: any) => s + (Number(e.amount) - Number(e.paid_amount)), 0);
    const aPagar = pay.reduce((s: number, e: any) => s + (Number(e.amount) - Number(e.paid_amount)), 0);
    const today = new Date().toISOString().slice(0, 10);
    const vencidos = [...recv, ...pay].filter((e: any) => e.status !== "pago" && e.due_date < today).length;

    const lucro = faturamento - despesas;
    const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;
    const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0;

    const cust = customers.data ?? [];
    const clientesAtivos = cust.filter((c: any) => c.status === "ativo").length;

    const yields = [
      ...((butter.data ?? []) as any[]).map((b) => Number(b.yield_percent ?? 0)),
      ...((cheese.data ?? []) as any[]).map((c) => Number(c.yield_percent ?? 0)),
    ].filter((n) => n > 0);
    const rendimentoMedio = yields.length ? yields.reduce((a, b) => a + b, 0) / yields.length : 0;

    return { faturamento, despesas, lucro, margem, ticketMedio, pedidos, clientesAtivos, rendimentoMedio, aReceber, aPagar, vencidos };
  },

  async revenueVsExpense(period: Period): Promise<MonthBucket[]> {
    const sinceD = startDate(period);
    const { data: entries } = await supabase
      .from("finance_entries")
      .select("kind, amount, paid_amount, due_date, status")
      .gte("due_date", sinceD)
      .limit(2000);

    const buckets = new Map<string, { receita: number; despesa: number }>();
    (entries ?? []).forEach((e: any) => {
      if (e.status === "cancelado") return;
      const m = String(e.due_date).slice(0, 7);
      const cur = buckets.get(m) ?? { receita: 0, despesa: 0 };
      const val = Number(e.paid_amount) > 0 ? Number(e.paid_amount) : Number(e.amount);
      if (e.kind === "receivable") cur.receita += val;
      else cur.despesa += val;
      buckets.set(m, cur);
    });

    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mes, v]) => ({ mes, receita: v.receita, despesa: v.despesa, lucro: v.receita - v.despesa }));
  },

  async productionYield(period: Period): Promise<YieldPoint[]> {
    const sinceD = startDate(period);
    const [bt, ch] = await Promise.all([
      supabase.from("production_butter").select("produced_at, yield_percent").gte("produced_at", sinceD).limit(500),
      supabase.from("production_cheese").select("produced_at, yield_percent").gte("produced_at", sinceD).limit(500),
    ]);
    const byDay = new Map<string, { sum: number; n: number }>();
    [...((bt.data ?? []) as any[]), ...((ch.data ?? []) as any[])].forEach((r) => {
      const d = String(r.produced_at);
      const y = Number(r.yield_percent ?? 0);
      if (!y) return;
      const cur = byDay.get(d) ?? { sum: 0, n: 0 };
      cur.sum += y; cur.n += 1;
      byDay.set(d, cur);
    });
    return Array.from(byDay.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dia, v]) => ({ dia: dia.slice(5), rendimento: +(v.sum / v.n).toFixed(1) }));
  },

  async channelMix(period: Period): Promise<ChannelSlice[]> {
    const sinceISO = startISO(period);
    const { data } = await supabase
      .from("sales_orders").select("channel, total, status")
      .gte("ordered_at", sinceISO).limit(1000);
    const map = new Map<string, number>();
    (data ?? []).forEach((o: any) => {
      if (o.status === "cancelado") return;
      map.set(o.channel, (map.get(o.channel) ?? 0) + Number(o.total));
    });
    const labels: Record<string, string> = {
      balcao: "Balcão", rota: "Rota", whatsapp: "WhatsApp", distribuidor: "Distribuidor",
    };
    return Array.from(map.entries()).map(([k, v]) => ({ name: labels[k] ?? k, value: +v.toFixed(2) }));
  },

  async topCustomers(period: Period, limit = 10): Promise<RankRow[]> {
    const sinceISO = startISO(period);
    const { data } = await supabase
      .from("sales_orders")
      .select("total, status, customer_id, customers(name)")
      .gte("ordered_at", sinceISO).limit(1000);
    const map = new Map<string, number>();
    (data ?? []).forEach((o: any) => {
      if (o.status === "cancelado") return;
      const name = o.customers?.name ?? "—";
      map.set(name, (map.get(name) ?? 0) + Number(o.total));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  },

  async topProducts(period: Period, limit = 10): Promise<RankRow[]> {
    const sinceISO = startISO(period);
    const { data: orders } = await supabase
      .from("sales_orders").select("id, status").gte("ordered_at", sinceISO).limit(1000);
    const ids = (orders ?? []).filter((o: any) => o.status !== "cancelado").map((o: any) => o.id);
    if (!ids.length) return [];
    const { data: items } = await supabase
      .from("sales_order_items")
      .select("total, quantity, item_id, inventory_items(name)")
      .in("order_id", ids).limit(2000);
    const map = new Map<string, number>();
    (items ?? []).forEach((it: any) => {
      const name = it.inventory_items?.name ?? "—";
      map.set(name, (map.get(name) ?? 0) + Number(it.total));
    });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, limit);
  },
};

export async function exportReportCSV(period: Period) {
  const sinceISO = startISO(period);
  const sinceD = startDate(period);
  const [{ data: orders }, { data: entries }] = await Promise.all([
    supabase.from("sales_orders").select("code, status, channel, total, ordered_at, customers(name)").gte("ordered_at", sinceISO).limit(2000),
    supabase.from("finance_entries").select("kind, description, amount, paid_amount, status, due_date").gte("due_date", sinceD).limit(2000),
  ]);

  const lines: string[] = [];
  lines.push("Tipo;Código/Descrição;Cliente/Categoria;Status;Canal/Tipo;Data;Valor;Pago");
  (orders ?? []).forEach((o: any) => {
    lines.push([
      "Pedido", o.code, o.customers?.name ?? "", o.status, o.channel, o.ordered_at?.slice(0, 10),
      Number(o.total).toFixed(2).replace(".", ","), "",
    ].join(";"));
  });
  (entries ?? []).forEach((e: any) => {
    lines.push([
      e.kind === "receivable" ? "A receber" : "A pagar",
      String(e.description ?? "").replace(/;/g, ","),
      "",
      e.status, "",
      String(e.due_date ?? "").slice(0, 10),
      Number(e.amount).toFixed(2).replace(".", ","),
      Number(e.paid_amount).toFixed(2).replace(".", ","),
    ].join(";"));
  });

  const csv = "\uFEFF" + lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `relatorio-${period}d-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}