import { supabase } from "@/integrations/supabase/client";
import { safeDiv } from "@/lib/utils";

const DAY_MS = 86400000;
const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export type DashboardKPIs = {
  faturamentoMes: number;
  faturamentoDelta: number;
  lucroMes: number;
  lucroDelta: number;
  producaoKg: number;
  producaoDelta: number;
  rendimentoMedio: number;
  rendimentoDelta: number;
  aReceber: number;
  aPagar: number;
  ticketMedio: number;
  pedidosConcluidos: number;
  inadimplencia: number;
  margem: number;
};

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const prevMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const prevMonthEnd = monthStart;
  const monthStartISO = monthStart.toISOString();
  const prevMonthStartISO = prevMonthStart.toISOString();
  const prevMonthEndISO = prevMonthEnd.toISOString();
  const monthStartDate = isoDate(monthStart);
  const prevMonthStartDate = isoDate(prevMonthStart);
  const prevMonthEndDate = isoDate(prevMonthEnd);
  const todayDate = isoDate(startOfDay(now));

  const [
    entriesPaidThis,
    entriesPaidPrev,
    entriesOpen,
    butterThis,
    butterPrev,
    cheeseThis,
    cheesePrev,
    ordersThis,
  ] = await Promise.all([
    supabase
      .from("finance_entries")
      .select("kind, paid_amount, amount, status, due_date, paid_at")
      .gte("paid_at", monthStartISO)
      .limit(2000),
    supabase
      .from("finance_entries")
      .select("kind, paid_amount")
      .gte("paid_at", prevMonthStartISO)
      .lt("paid_at", prevMonthEndISO)
      .limit(2000),
    supabase
      .from("finance_entries")
      .select("kind, amount, paid_amount, status, due_date")
      .in("status", ["pendente", "parcial"])
      .limit(2000),
    supabase
      .from("production_butter")
      .select("butter_kg, yield_percent")
      .gte("produced_at", monthStartDate)
      .limit(1000),
    supabase
      .from("production_butter")
      .select("butter_kg")
      .gte("produced_at", prevMonthStartDate)
      .lt("produced_at", prevMonthEndDate)
      .limit(1000),
    supabase
      .from("production_cheese")
      .select("cheese_kg, yield_percent")
      .gte("produced_at", monthStartDate)
      .limit(1000),
    supabase
      .from("production_cheese")
      .select("cheese_kg")
      .gte("produced_at", prevMonthStartDate)
      .lt("produced_at", prevMonthEndDate)
      .limit(1000),
    supabase
      .from("sales_orders")
      .select("total, status")
      .gte("ordered_at", monthStartISO)
      .limit(2000),
  ]);

  const paidThis = entriesPaidThis.data ?? [];
  const paidPrev = entriesPaidPrev.data ?? [];
  const open = entriesOpen.data ?? [];

  const receitaThis = paidThis
    .filter((e) => e.kind === "receivable")
    .reduce((s, e) => s + num(e.paid_amount), 0);
  const despesaThis = paidThis
    .filter((e) => e.kind === "payable")
    .reduce((s, e) => s + num(e.paid_amount), 0);
  const receitaPrev = paidPrev
    .filter((e) => e.kind === "receivable")
    .reduce((s, e) => s + num(e.paid_amount), 0);
  const despesaPrev = paidPrev
    .filter((e) => e.kind === "payable")
    .reduce((s, e) => s + num(e.paid_amount), 0);

  const lucroThis = receitaThis - despesaThis;
  const lucroPrev = receitaPrev - despesaPrev;

  const aReceber = open
    .filter((e) => e.kind === "receivable")
    .reduce((s, e) => s + Math.max(0, num(e.amount) - num(e.paid_amount)), 0);
  const aPagar = open
    .filter((e) => e.kind === "payable")
    .reduce((s, e) => s + Math.max(0, num(e.amount) - num(e.paid_amount)), 0);

  const vencidos = open.filter(
    (e) => e.kind === "receivable" && e.due_date && e.due_date < todayDate,
  );
  const vencidosValor = vencidos.reduce(
    (s, e) => s + Math.max(0, num(e.amount) - num(e.paid_amount)),
    0,
  );
  const inadimplencia = safeDiv(vencidosValor, aReceber + receitaThis) * 100;

  const butterKgThis = (butterThis.data ?? []).reduce((s, b) => s + num(b.butter_kg), 0);
  const cheeseKgThis = (cheeseThis.data ?? []).reduce((s, c) => s + num(c.cheese_kg), 0);
  const butterKgPrev = (butterPrev.data ?? []).reduce((s, b) => s + num(b.butter_kg), 0);
  const cheeseKgPrev = (cheesePrev.data ?? []).reduce((s, c) => s + num(c.cheese_kg), 0);
  const producaoKg = butterKgThis + cheeseKgThis;
  const producaoPrev = butterKgPrev + cheeseKgPrev;

  const yields = [
    ...(butterThis.data ?? []).map((b) => num(b.yield_percent)),
    ...(cheeseThis.data ?? []).map((c) => num(c.yield_percent)),
  ].filter((v) => v > 0);
  const rendimentoMedio = yields.length
    ? yields.reduce((s, v) => s + v, 0) / yields.length
    : 0;

  const ordersConfirmed = (ordersThis.data ?? []).filter(
    (o) => o.status === "confirmado" || o.status === "em_rota" || o.status === "entregue",
  );
  const ordersDelivered = (ordersThis.data ?? []).filter((o) => o.status === "entregue");
  const ticketMedio = ordersConfirmed.length
    ? ordersConfirmed.reduce((s, o) => s + num(o.total), 0) / ordersConfirmed.length
    : 0;

  const margem = safeDiv(lucroThis, receitaThis) * 100;

  return {
    faturamentoMes: receitaThis,
    faturamentoDelta: safeDiv(receitaThis - receitaPrev, receitaPrev) * 100,
    lucroMes: lucroThis,
    lucroDelta: safeDiv(lucroThis - lucroPrev, Math.abs(lucroPrev)) * 100,
    producaoKg,
    producaoDelta: safeDiv(producaoKg - producaoPrev, producaoPrev) * 100,
    rendimentoMedio,
    rendimentoDelta: 0,
    aReceber,
    aPagar,
    ticketMedio,
    pedidosConcluidos: ordersDelivered.length,
    inadimplencia,
    margem,
  };
}

export type WeeklyPoint = { day: string; kg: number; rendimento: number };

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export async function getWeeklyProduction(): Promise<WeeklyPoint[]> {
  const today = startOfDay(new Date());
  const since = new Date(today.getTime() - 6 * DAY_MS);
  const sinceDate = isoDate(since);

  const [butter, cheese] = await Promise.all([
    supabase
      .from("production_butter")
      .select("produced_at, butter_kg, yield_percent")
      .gte("produced_at", sinceDate)
      .limit(500),
    supabase
      .from("production_cheese")
      .select("produced_at, cheese_kg, yield_percent")
      .gte("produced_at", sinceDate)
      .limit(500),
  ]);

  const buckets = new Map<string, { kg: number; yieldSum: number; yieldCount: number }>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(since.getTime() + i * DAY_MS);
    buckets.set(isoDate(d), { kg: 0, yieldSum: 0, yieldCount: 0 });
  }

  for (const b of butter.data ?? []) {
    const k = b.produced_at as string;
    const e = buckets.get(k);
    if (!e) continue;
    e.kg += num(b.butter_kg);
    const y = num(b.yield_percent);
    if (y > 0) {
      e.yieldSum += y;
      e.yieldCount += 1;
    }
  }
  for (const c of cheese.data ?? []) {
    const k = c.produced_at as string;
    const e = buckets.get(k);
    if (!e) continue;
    e.kg += num(c.cheese_kg);
    const y = num(c.yield_percent);
    if (y > 0) {
      e.yieldSum += y;
      e.yieldCount += 1;
    }
  }

  return Array.from(buckets.entries()).map(([dateStr, v]) => {
    const d = new Date(dateStr + "T00:00:00");
    return {
      day: DAY_LABELS[d.getDay()],
      kg: Math.round(v.kg * 10) / 10,
      rendimento: v.yieldCount ? v.yieldSum / v.yieldCount : 0,
    };
  });
}

export type MonthlyFinancePoint = {
  mes: string;
  receita: number;
  despesa: number;
  lucro: number;
};

const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export async function getMonthlyFinance(): Promise<MonthlyFinancePoint[]> {
  const now = new Date();
  const startRef = new Date(now.getFullYear(), now.getMonth() - 7, 1);
  const startISO = startRef.toISOString();

  const { data } = await supabase
    .from("finance_entries")
    .select("kind, paid_amount, paid_at")
    .gte("paid_at", startISO)
    .not("paid_at", "is", null)
    .limit(5000);

  const buckets = new Map<string, { receita: number; despesa: number }>();
  for (let i = 0; i < 8; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - 7 + i, 1);
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, { receita: 0, despesa: 0 });
  }

  for (const e of data ?? []) {
    if (!e.paid_at) continue;
    const d = new Date(e.paid_at);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const b = buckets.get(k);
    if (!b) continue;
    if (e.kind === "receivable") b.receita += num(e.paid_amount);
    else if (e.kind === "payable") b.despesa += num(e.paid_amount);
  }

  return Array.from(buckets.entries()).map(([k, v]) => {
    const [, m] = k.split("-").map(Number);
    return {
      mes: MONTH_LABELS[m],
      receita: v.receita,
      despesa: v.despesa,
      lucro: v.receita - v.despesa,
    };
  });
}

export type ChannelSlice = { name: string; value: number };

const CHANNEL_LABELS: Record<string, string> = {
  balcao: "Balcão",
  rota: "Rota",
  whatsapp: "WhatsApp",
  distribuidor: "Distribuidor",
};

export async function getSalesChannels(): Promise<ChannelSlice[]> {
  const monthStartISO = startOfMonth().toISOString();
  const { data } = await supabase
    .from("sales_orders")
    .select("channel, total, status")
    .gte("ordered_at", monthStartISO)
    .neq("status", "cancelado")
    .limit(2000);

  const totals = new Map<string, number>();
  let grand = 0;
  for (const o of data ?? []) {
    const t = num(o.total);
    if (t <= 0) continue;
    totals.set(o.channel, (totals.get(o.channel) ?? 0) + t);
    grand += t;
  }
  if (!grand) return [];
  return Array.from(totals.entries())
    .map(([k, v]) => ({
      name: CHANNEL_LABELS[k] ?? k,
      value: Math.round((v / grand) * 100),
    }))
    .sort((a, b) => b.value - a.value);
}

export type TopClient = {
  name: string;
  value: number;
  orders: number;
  meta: number;
  status: "Ativo" | "Inadimplente";
};

export async function getTopClients(limit = 5): Promise<TopClient[]> {
  const monthStartISO = startOfMonth().toISOString();

  const { data: orders } = await supabase
    .from("sales_orders")
    .select("customer_id, total, status")
    .gte("ordered_at", monthStartISO)
    .neq("status", "cancelado")
    .limit(5000);

  const agg = new Map<string, { value: number; orders: number }>();
  for (const o of orders ?? []) {
    if (!o.customer_id) continue;
    const cur = agg.get(o.customer_id) ?? { value: 0, orders: 0 };
    cur.value += num(o.total);
    cur.orders += 1;
    agg.set(o.customer_id, cur);
  }
  if (agg.size === 0) return [];

  const ids = Array.from(agg.keys());
  const { data: customers } = await supabase
    .from("customers")
    .select("id, name, status")
    .in("id", ids);

  const byId = new Map((customers ?? []).map((c) => [c.id, c]));
  const max = Math.max(...Array.from(agg.values()).map((a) => a.value), 1);

  return Array.from(agg.entries())
    .map(([id, v]) => {
      const c = byId.get(id);
      return {
        name: c?.name ?? "Cliente",
        value: v.value,
        orders: v.orders,
        meta: Math.round(safeDiv(v.value, max) * 100),
        status: (c?.status === "inativo" ? "Inadimplente" : "Ativo") as
          | "Ativo"
          | "Inadimplente",
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}