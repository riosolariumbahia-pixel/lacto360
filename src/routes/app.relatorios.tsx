import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, DollarSign, Percent, Receipt, TrendingUp, Users, Activity } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { PageHeader } from "@/components/app/page-header";
import { ChartCard, ChartTooltip } from "@/components/app/chart-card";
import { KpiCard } from "@/components/app/kpi-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { fmtBRL } from "@/lib/utils";
import { reportsApi, exportReportCSV, type Period } from "@/lib/reports";
import { toast } from "sonner";

export const Route = createFileRoute("/app/relatorios")({ component: RelPage });

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function RelPage() {
  const [period, setPeriod] = useState<Period>(30);

  const kpis = useQuery({ queryKey: ["rep", "kpis", period], queryFn: () => reportsApi.executive(period) });
  const flow = useQuery({ queryKey: ["rep", "flow", period], queryFn: () => reportsApi.revenueVsExpense(period) });
  const yieldQ = useQuery({ queryKey: ["rep", "yield", period], queryFn: () => reportsApi.productionYield(period) });
  const channels = useQuery({ queryKey: ["rep", "channels", period], queryFn: () => reportsApi.channelMix(period) });
  const topC = useQuery({ queryKey: ["rep", "topC", period], queryFn: () => reportsApi.topCustomers(period, 10) });
  const topP = useQuery({ queryKey: ["rep", "topP", period], queryFn: () => reportsApi.topProducts(period, 10) });

  async function handleExport() {
    try {
      await exportReportCSV(period);
      toast.success("Relatório exportado.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao exportar");
    }
  }

  const k = kpis.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Visão consolidada do desempenho"
        action={
          <div className="flex items-center gap-2">
            <Select value={String(period)} onValueChange={(v) => setPeriod(Number(v) as Period)}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="size-4 mr-2" /> Exportar CSV
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.isLoading || !k ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)
        ) : (
          <>
            <KpiCard label="Faturamento" value={k.faturamento} format={fmtBRL} icon={DollarSign} tone="primary" />
            <KpiCard label="Lucro" value={k.lucro} format={fmtBRL} icon={TrendingUp} tone="gold" />
            <KpiCard label="Margem" value={k.margem} format={(n) => `${n.toFixed(1)}%`} icon={Percent} tone="info" />
            <KpiCard label="Ticket médio" value={k.ticketMedio} format={fmtBRL} icon={Receipt} tone="primary" />
            <KpiCard label="Clientes ativos" value={k.clientesAtivos} icon={Users} tone="info" />
            <KpiCard label="Rendimento médio" value={k.rendimentoMedio} format={(n) => `${n.toFixed(1)}%`} icon={Activity} tone="gold" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Receita × Despesa × Lucro">
          <div className="h-72">
            {flow.isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer>
                <AreaChart data={flow.data ?? []}>
                  <defs>
                    <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gDes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<ChartTooltip format={(v: number) => fmtBRL(v)} />} />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="receita" name="Receita" stroke="var(--chart-1)" strokeWidth={2} fill="url(#gRec)" />
                  <Area type="monotone" dataKey="despesa" name="Despesa" stroke="var(--chart-3)" strokeWidth={2} fill="url(#gDes)" />
                  <Line type="monotone" dataKey="lucro" name="Lucro" stroke="var(--gold)" strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Rendimento de produção (%)">
          <div className="h-72">
            {yieldQ.isLoading ? <Skeleton className="h-full w-full" /> : (
              <ResponsiveContainer>
                <LineChart data={yieldQ.data ?? []}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="dia" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip format={(v: number) => `${v}%`} />} />
                  <Line type="monotone" dataKey="rendimento" stroke="var(--gold)" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Mix de canais">
          <div className="h-80">
            {channels.isLoading ? <Skeleton className="h-full w-full" /> : (channels.data?.length ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={channels.data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={3}>
                    {channels.data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--card)" strokeWidth={2} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip format={(v: number) => fmtBRL(v)} />} />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyHint label="Sem vendas no período." />)}
          </div>
        </ChartCard>

        <ChartCard title="Top 10 clientes">
          <div className="h-80">
            {topC.isLoading ? <Skeleton className="h-full w-full" /> : (topC.data?.length ? (
              <ResponsiveContainer>
                <BarChart data={topC.data} layout="vertical" margin={{ left: 24 }}>
                  <CartesianGrid stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" stroke="var(--muted-foreground)" fontSize={12} width={120} />
                  <Tooltip content={<ChartTooltip format={(v: number) => fmtBRL(v)} />} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyHint label="Sem clientes com pedidos." />)}
          </div>
        </ChartCard>
      </div>

      <ChartCard title="Top produtos">
        <div className="overflow-x-auto">
          {topP.isLoading ? <Skeleton className="h-32 w-full" /> : (topP.data?.length ? (
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground">
                <tr><th className="px-3 py-2 text-left">#</th><th className="px-3 py-2 text-left">Produto</th><th className="px-3 py-2 text-right">Faturamento</th></tr>
              </thead>
              <tbody>
                {topP.data.map((p, i) => (
                  <tr key={p.name} className="border-t">
                    <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-3 py-2 font-medium">{p.name}</td>
                    <td className="px-3 py-2 text-right">{fmtBRL(p.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <EmptyHint label="Sem itens vendidos no período." />)}
        </div>
      </ChartCard>
    </div>
  );
}

function EmptyHint({ label }: { label: string }) {
  return <div className="grid h-full place-items-center text-sm text-muted-foreground">{label}</div>;
}
