import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

async function buildOrgContext(supabase: any, userId: string): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id, organizations(name)")
    .eq("id", userId)
    .maybeSingle();

  const orgId = profile?.org_id;
  const orgName = (profile?.organizations as any)?.name ?? "Laticínio";
  if (!orgId) return `Empresa: ${orgName}. Sem dados ainda.`;

  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const sinceDate = since.slice(0, 10);

  const [orders, entries, items, butter, cheese, customers] = await Promise.all([
    supabase.from("sales_orders").select("total, status, channel, ordered_at").gte("ordered_at", since).limit(500),
    supabase.from("finance_entries").select("kind, amount, paid_amount, status, due_date").gte("due_date", sinceDate).limit(500),
    supabase.from("inventory_items").select("name, stock_qty, min_stock, sale_price").eq("is_active", true).limit(200),
    supabase.from("production_butter").select("milk_liters, butter_kg, yield_percent, produced_at").gte("produced_at", sinceDate).limit(200),
    supabase.from("production_cheese").select("milk_liters, cheese_kg, yield_percent, produced_at").gte("produced_at", sinceDate).limit(200),
    supabase.from("customers").select("name, status").limit(500),
  ]);

  const ord = orders.data ?? [];
  const ent = entries.data ?? [];
  const inv = items.data ?? [];
  const bt = butter.data ?? [];
  const ch = cheese.data ?? [];
  const cust = customers.data ?? [];

  const sum = (a: any[], k: string) => a.reduce((s, r) => s + Number(r[k] ?? 0), 0);
  const validOrders = ord.filter((o: any) => o.status !== "cancelado");
  const faturamento = sum(validOrders, "total");
  const receivables = ent.filter((e: any) => e.kind === "receivable" && e.status !== "cancelado");
  const payables = ent.filter((e: any) => e.kind === "payable" && e.status !== "cancelado");
  const aReceber = receivables.reduce((s, e: any) => s + (Number(e.amount) - Number(e.paid_amount)), 0);
  const aPagar = payables.reduce((s, e: any) => s + (Number(e.amount) - Number(e.paid_amount)), 0);
  const today = new Date().toISOString().slice(0, 10);
  const vencidos = [...receivables, ...payables].filter((e: any) => e.status !== "pago" && e.due_date < today).length;
  const despesas = payables.reduce((s, e: any) => s + Number(e.paid_amount), 0);
  const lucro = faturamento - despesas;
  const margem = faturamento > 0 ? (lucro / faturamento) * 100 : 0;

  const channelMix: Record<string, number> = {};
  validOrders.forEach((o: any) => { channelMix[o.channel] = (channelMix[o.channel] ?? 0) + Number(o.total); });

  const lowStock = inv.filter((i: any) => Number(i.stock_qty) < Number(i.min_stock)).slice(0, 8);
  const yieldButter = bt.length ? sum(bt, "yield_percent") / bt.length : 0;
  const yieldCheese = ch.length ? sum(ch, "yield_percent") / ch.length : 0;
  const milkUsed = sum(bt, "milk_liters") + sum(ch, "milk_liters");

  const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return `Empresa: ${orgName}
Período de referência: últimos 30 dias.

FINANCEIRO:
- Faturamento: ${fmt(faturamento)} (${validOrders.length} pedidos)
- Despesas pagas: ${fmt(despesas)}
- Lucro estimado: ${fmt(lucro)} (margem ${margem.toFixed(1)}%)
- A receber em aberto: ${fmt(aReceber)}
- A pagar em aberto: ${fmt(aPagar)}
- Lançamentos vencidos: ${vencidos}

VENDAS POR CANAL:
${Object.entries(channelMix).map(([c, v]) => `- ${c}: ${fmt(v as number)}`).join("\n") || "- (sem vendas)"}

PRODUÇÃO:
- Leite processado: ${milkUsed.toLocaleString("pt-BR")} L
- Rendimento médio manteiga: ${yieldButter.toFixed(1)}%
- Rendimento médio queijo: ${yieldCheese.toFixed(1)}%

ESTOQUE BAIXO (${lowStock.length}):
${lowStock.map((i: any) => `- ${i.name}: ${i.stock_qty} (mín ${i.min_stock})`).join("\n") || "- (tudo ok)"}

CLIENTES: ${cust.length} cadastrados (${cust.filter((c: any) => c.status === "ativo").length} ativos).`;
}

function gatewayError(status: number): string {
  if (status === 429) return "Limite de uso da IA atingido. Tente novamente em instantes.";
  if (status === 402) return "Créditos de IA esgotados. Adicione créditos em Configurações.";
  return `Falha ao chamar a IA (status ${status}).`;
}

export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      messages: z
        .array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string().min(1).max(4000),
          }),
        )
        .min(1)
        .max(40),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const ctx = await buildOrgContext(supabase, userId);
    const messages: ChatMsg[] = [
      {
        role: "system",
        content:
          "Você é o copiloto de gestão de um laticínio brasileiro. Responda em português, de forma direta, prática e baseada nos dados fornecidos abaixo. Use markdown leve (listas, negrito) quando útil. Se a pergunta não puder ser respondida com os dados, diga isso e sugira o que registrar no sistema.\n\nDADOS DA EMPRESA:\n" +
          ctx,
      },
      ...data.messages,
    ];

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: MODEL, messages }),
    });

    if (!res.ok) {
      throw new Error(gatewayError(res.status));
    }
    const json = await res.json();
    const content: string = json?.choices?.[0]?.message?.content ?? "";
    return { content };
  });

export const generateInsights = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY não configurada.");

    const ctx = await buildOrgContext(supabase, userId);

    const messages: ChatMsg[] = [
      {
        role: "system",
        content:
          "Você é um analista de gestão de laticínios. Gere de 3 a 5 insights ACIONÁVEIS a partir dos dados fornecidos. Cada insight tem: title (curto, máx 50 chars), text (1-2 frases, máx 220 chars), tone ('success'|'warning'|'info'), icon ('trend'|'alert'|'users'|'target'). Responda APENAS com JSON válido no formato {\"insights\":[...]}. Sem markdown, sem comentários.",
      },
      { role: "user", content: "Analise os dados e retorne o JSON.\n\n" + ctx },
    ];

    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) throw new Error(gatewayError(res.status));
    const json = await res.json();
    const raw = json?.choices?.[0]?.message?.content ?? "{}";
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = {}; }
    const insights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 5) : [];
    return {
      insights: insights.map((i: any, idx: number) => ({
        id: idx,
        title: String(i.title ?? "Insight"),
        text: String(i.text ?? ""),
        tone: ["success", "warning", "info"].includes(i.tone) ? i.tone : "info",
        icon: ["trend", "alert", "users", "target"].includes(i.icon) ? i.icon : "trend",
      })),
    };
  });