import { createFileRoute } from "@tanstack/react-router";
import { DollarSign, TrendingUp, Wallet } from "lucide-react";
import { ChartCard, ChartTooltip } from "@/components/app/chart-card";
import { KpiCard } from "@/components/app/kpi-card";
import { fmtBRL, kpis, monthlyFinance } from "@/lib/mock-data";
import { PageHeader } from "@/components/app/page-header";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/app/financeiro")({ component: FinPage });

function FinPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" subtitle="Faturamento, lucro e fluxo do laticínio" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Faturamento" value={kpis.faturamentoMes} format={fmtBRL} delta={kpis.faturamentoDelta} icon={Wallet} tone="primary" />
        <KpiCard label="Lucro líquido" value={kpis.lucroMes} format={fmtBRL} delta={kpis.lucroDelta} icon={DollarSign} tone="gold" />
        <KpiCard label="Margem" value={Math.round((kpis.lucroMes / kpis.faturamentoMes) * 100)} suffix="%" icon={TrendingUp} tone="info" />
      </div>

      <ChartCard title="Receita × Lucro" subtitle="Evolução mensal">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyFinance} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.5} /><stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip content={<ChartTooltip format={(v: number) => fmtBRL(v)} />} />
              <Area type="monotone" name="Receita" dataKey="receita" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#gR)" />
              <Area type="monotone" name="Lucro" dataKey="lucro" stroke="var(--chart-2)" strokeWidth={2.5} fill="url(#gL)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}
