import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowRight, Brain, DollarSign, Factory, Percent, Wallet } from "lucide-react";
import { KpiCard } from "@/components/app/kpi-card";
import { ChartCard, ChartTooltip } from "@/components/app/chart-card";
import { fmtBRL } from "@/lib/utils";
import {
  getDashboardKPIs,
  getWeeklyProduction,
  getMonthlyFinance,
  getSalesChannels,
  getTopClients,
} from "@/lib/dashboard";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function DashboardPage() {
  const session = useSession();
  const h = new Date().getHours();
  const greet = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const firstName = session.user?.name?.split(" ")[0] ?? "produtor";

  const kpisQ = useQuery({ queryKey: ["dashboard", "kpis"], queryFn: getDashboardKPIs, staleTime: 30_000 });
  const weeklyQ = useQuery({ queryKey: ["dashboard", "weekly"], queryFn: getWeeklyProduction, staleTime: 30_000 });
  const monthlyQ = useQuery({ queryKey: ["dashboard", "monthly"], queryFn: getMonthlyFinance, staleTime: 30_000 });
  const channelsQ = useQuery({ queryKey: ["dashboard", "channels"], queryFn: getSalesChannels, staleTime: 30_000 });
  const topClientsQ = useQuery({ queryKey: ["dashboard", "topClients"], queryFn: () => getTopClients(5), staleTime: 30_000 });

  const k = kpisQ.data;
  const weekly = weeklyQ.data ?? [];
  const monthly = monthlyQ.data ?? [];
  const channels = channelsQ.data ?? [];
  const top = topClientsQ.data ?? [];

  const sparkProd = weekly.map((d) => ({ v: d.kg }));
  const sparkRev = monthly.map((d) => ({ v: d.receita }));
  const sparkLuc = monthly.map((d) => ({ v: d.lucro }));
  const sparkRen = weekly.map((d) => ({ v: d.rendimento }));

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-hero p-6 text-white md:p-8">
        <div className="absolute inset-0 grid-bg radial-fade opacity-30" />
        <div className="relative">
          <Badge className="bg-white/15 text-white hover:bg-white/20">Visão geral · em tempo real</Badge>
          <h1 className="mt-3 font-serif text-3xl md:text-5xl">{greet}, {firstName} 👋</h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 md:text-base">
            {k ? (
              <>Faturamento do mês: <span className="font-semibold text-white">{fmtBRL(k.faturamentoMes)}</span> · Lucro: <span className="font-semibold text-white">{fmtBRL(k.lucroMes)}</span></>
            ) : (
              "Carregando seus indicadores em tempo real…"
            )}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="bg-white text-foreground hover:bg-white/90">
              <Link to="/app/producao">Registrar lote <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Link to="/app/assistente"><Brain className="mr-1 size-4" />Perguntar à IA</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpisQ.isLoading || !k ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <KpiCard label="Faturamento (mês)" value={k.faturamentoMes} format={fmtBRL} delta={k.faturamentoDelta} icon={Wallet} tone="primary" spark={sparkRev} />
            <KpiCard label="Produção (mês)" value={Math.round(k.producaoKg)} delta={k.producaoDelta} icon={Factory} tone="gold" suffix="kg" spark={sparkProd} />
            <KpiCard label="Lucro líquido" value={k.lucroMes} format={fmtBRL} delta={k.lucroDelta} icon={DollarSign} tone="info" spark={sparkLuc} />
            <KpiCard label="Rendimento médio" value={Math.round(k.rendimentoMedio * 10) / 10} delta={k.rendimentoDelta} icon={Percent} tone="warning" suffix="%" spark={sparkRen} />
          </>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Produção semanal" subtitle="Quilos por dia (manteiga + queijo)" className="lg:col-span-2">
          <div className="h-72">
            {weeklyQ.isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : weekly.every((d) => d.kg === 0) ? (
              <EmptyState text="Nenhuma produção nos últimos 7 dias." cta="Registrar lote" to="/app/producao" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gProd" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip format={(v: number) => `${v} kg`} />} />
                  <Area type="monotone" name="Produção (kg)" dataKey="kg" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gProd)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Canais de venda" subtitle="Distribuição do mês">
          <div className="h-72">
            {channelsQ.isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : channels.length === 0 ? (
              <EmptyState text="Sem vendas neste mês." cta="Criar pedido" to="/app/vendas" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={channels} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                    {channels.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip format={(v: number) => `${v}%`} />} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Receita × Despesa × Lucro" subtitle="Últimos 8 meses (caixa pago)" className="lg:col-span-2">
          <div className="h-72">
            {monthlyQ.isLoading ? (
              <Skeleton className="h-full w-full rounded-xl" />
            ) : monthly.every((m) => m.receita === 0 && m.despesa === 0) ? (
              <EmptyState text="Sem lançamentos financeiros." cta="Abrir financeiro" to="/app/financeiro" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                  <Tooltip content={<ChartTooltip format={(v: number) => fmtBRL(v)} />} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="receita" name="Receita" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="despesa" name="Despesa" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="lucro" name="Lucro" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <div className="rounded-2xl border bg-card p-5 animate-fade-in-up">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Resumo financeiro</h3>
              <p className="text-xs text-muted-foreground">Posição em aberto</p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/app/financeiro">Abrir</Link>
            </Button>
          </div>
          {kpisQ.isLoading || !k ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
            </div>
          ) : (
            <div className="space-y-2">
              <Row label="A receber" value={fmtBRL(k.aReceber)} tone="info" />
              <Row label="A pagar" value={fmtBRL(k.aPagar)} tone="warning" />
              <Row label="Ticket médio" value={fmtBRL(k.ticketMedio)} />
              <Row label="Pedidos entregues" value={String(k.pedidosConcluidos)} />
              <Row label="Margem" value={`${Math.round(k.margem * 10) / 10}%`} tone={k.margem >= 0 ? "success" : "danger"} />
              <Row label="Inadimplência" value={`${Math.round(k.inadimplencia * 10) / 10}%`} tone={k.inadimplencia > 10 ? "danger" : "muted"} />
            </div>
          )}
        </div>
      </section>

      <ChartCard title="Top clientes" subtitle="Faturamento do mês e participação">
        {topClientsQ.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
        ) : top.length === 0 ? (
          <EmptyState text="Sem clientes com vendas neste mês." cta="Criar pedido" to="/app/vendas" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2">Cliente</th>
                  <th>Pedidos</th>
                  <th>Faturado</th>
                  <th className="w-1/3">Participação</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {top.map((c) => (
                  <tr key={c.name} className="hover:bg-muted/40">
                    <td className="py-3 font-medium">{c.name}</td>
                    <td>{c.orders}</td>
                    <td className="font-semibold">{fmtBRL(c.value)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div className="h-full bg-gradient-primary" style={{ width: `${c.meta}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{c.meta}%</span>
                      </div>
                    </td>
                    <td>
                      <Badge variant={c.status === "Ativo" ? "secondary" : "destructive"}>{c.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "info" | "warning" | "success" | "danger" | "muted" }) {
  const toneCls =
    tone === "info" ? "text-info"
      : tone === "warning" ? "text-warning"
      : tone === "success" ? "text-success"
      : tone === "danger" ? "text-destructive"
      : tone === "muted" ? "text-muted-foreground"
      : "text-foreground";
  return (
    <div className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${toneCls}`}>{value}</span>
    </div>
  );
}

function EmptyState({ text, cta, to }: { text: string; cta: string; to: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 p-6 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button asChild size="sm" variant="outline">
        <Link to={to}>{cta}</Link>
      </Button>
    </div>
  );
}