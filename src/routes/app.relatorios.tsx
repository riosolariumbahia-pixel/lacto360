import { createFileRoute } from "@tanstack/react-router";
import { ChartCard, ChartTooltip } from "@/components/app/chart-card";
import { fmtBRL, monthlyFinance, weeklyProduction, salesByChannel } from "@/lib/mock-data";
import { PageHeader } from "@/components/app/page-header";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const Route = createFileRoute("/app/relatorios")({ component: RelPage });
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function RelPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Relatórios" subtitle="Visão consolidada do desempenho" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Rendimento diário (%)">
          <div className="h-72">
            <ResponsiveContainer><AreaChart data={weeklyProduction}>
              <defs><linearGradient id="gRen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--gold)" stopOpacity={0.55} /><stop offset="100%" stopColor="var(--gold)" stopOpacity={0} />
              </linearGradient></defs>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip format={(v: number) => `${v}%`} />} />
              <Area type="monotone" dataKey="rendimento" name="Rendimento" stroke="var(--gold)" strokeWidth={2.5} fill="url(#gRen)" />
            </AreaChart></ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Despesa mensal">
          <div className="h-72">
            <ResponsiveContainer><BarChart data={monthlyFinance}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip content={<ChartTooltip format={(v: number) => fmtBRL(v)} />} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="despesa" name="Despesa" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart></ResponsiveContainer>
          </div>
        </ChartCard>
        <ChartCard title="Mix de canais" className="lg:col-span-2">
          <div className="h-80">
            <ResponsiveContainer><PieChart>
              <Pie data={salesByChannel} dataKey="value" nameKey="name" innerRadius={70} outerRadius={120} paddingAngle={3}>
                {salesByChannel.map((_, i) => <Cell key={i} fill={COLORS[i]} stroke="var(--card)" strokeWidth={2} />)}
              </Pie>
              <Tooltip content={<ChartTooltip format={(v: number) => `${v}%`} />} />
              <Legend iconType="circle" />
            </PieChart></ResponsiveContainer>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
