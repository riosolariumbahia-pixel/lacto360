import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowRight, Brain, DollarSign, Factory, Percent, Wallet,
} from "lucide-react";
import { KpiCard } from "@/components/app/kpi-card";
import { ChartCard, ChartTooltip } from "@/components/app/chart-card";
import { AiInsightCard } from "@/components/app/ai-insight-card";
import {
  aiInsights, fmtBRL, kpis, monthlyFinance, salesByChannel, topClients, weeklyProduction,
} from "@/lib/mock-data";
import { useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_app/")({
  component: DashboardPage,
});

const PIE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function DashboardPage() {
  const session = useSession();
  const greet = new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite";
  const firstName = session.user?.name?.split(" ")[0] ?? "produtor";

  const sparkProd = weeklyProduction.map((d) => ({ v: d.kg }));
  const sparkRev = monthlyFinance.map((d) => ({ v: d.receita }));
  const sparkLuc = monthlyFinance.map((d) => ({ v: d.lucro }));
  const sparkRen = weeklyProduction.map((d) => ({ v: d.rendimento }));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-hero p-6 text-white md:p-8">
        <div className="absolute inset-0 grid-bg radial-fade opacity-30" />
        <div className="relative">
          <Badge className="bg-white/15 text-white hover:bg-white/20">Visão geral · Maio 2026</Badge>
          <h1 className="mt-3 font-serif text-3xl md:text-5xl">
            {greet}, {firstName} 👋
          </h1>
          <p className="mt-2 max-w-xl text-sm text-white/80 md:text-base">
            Sua produção rendeu <span className="font-semibold text-white">{fmtBRL(12480)}</span> esta semana — 12% acima do mesmo período do mês passado.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild className="bg-white text-foreground hover:bg-white/90">
              <Link to="/_app/producao" search={undefined as never}>Registrar lote <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
            <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20">
              <Link to="/_app/assistente" search={undefined as never}><Brain className="mr-1 size-4" />Perguntar à IA</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Faturamento (mês)" value={kpis.faturamentoMes} format={fmtBRL} delta={kpis.faturamentoDelta} icon={Wallet} tone="primary" spark={sparkRev} />
        <KpiCard label="Manteiga produzida" value={kpis.manteigaKg} delta={kpis.manteigaDelta} icon={Factory} tone="gold" suffix="kg" spark={sparkProd} />
        <KpiCard label="Lucro líquido" value={kpis.lucroMes} format={fmtBRL} delta={kpis.lucroDelta} icon={DollarSign} tone="info" spark={sparkLuc} />
        <KpiCard label="Rendimento médio" value={kpis.rendimentoMedio} delta={kpis.rendimentoDelta} icon={Percent} tone="warning" suffix="%" spark={sparkRen} />
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Produção semanal" subtitle="Quilos de manteiga por dia" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyProduction} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <Area type="monotone" name="Manteiga (kg)" dataKey="kg" stroke="var(--primary)" strokeWidth={2.5} fill="url(#gProd)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Canais de venda" subtitle="Distribuição do mês">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesByChannel} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3}>
                  {salesByChannel.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip format={(v: number) => `${v}%`} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Receita × Despesa × Lucro" subtitle="Últimos meses" className="lg:col-span-2">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyFinance} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip content={<ChartTooltip format={(v: number) => fmtBRL(v)} />} cursor={{ fill: "var(--muted)" }} />
                <Bar dataKey="receita" name="Receita" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="despesa" name="Despesa" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="lucro" name="Lucro" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <div className="rounded-2xl border bg-card p-5 animate-fade-in-up">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Assistente 360 IA</h3>
              <p className="text-xs text-muted-foreground">Insights gerados automaticamente</p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link to="/_app/assistente" search={undefined as never}>Abrir</Link>
            </Button>
          </div>
          <div className="space-y-3">
            {aiInsights.slice(0, 3).map((i) => (
              <AiInsightCard key={i.id} title={i.title} text={i.text} tone={i.tone} icon={i.icon as any} />
            ))}
          </div>
        </div>
      </section>

      {/* Top clients */}
      <ChartCard title="Top clientes" subtitle="Faturamento e progresso da meta">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2">Cliente</th>
                <th>Pedidos</th>
                <th>Faturado</th>
                <th className="w-1/3">Meta</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topClients.map((c) => (
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
      </ChartCard>
    </div>
  );
}
