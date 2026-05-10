import { createFileRoute } from "@tanstack/react-router";
import { Plus, Factory, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChartCard, ChartTooltip } from "@/components/app/chart-card";
import { KpiCard } from "@/components/app/kpi-card";
import { fmtBRL, lotes, weeklyProduction } from "@/lib/mock-data";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/app/producao")({
  component: ProducaoPage,
});

function ProducaoPage() {
  const totalKg = lotes.reduce((a, b) => a + b.kg, 0);
  const margemMedia = lotes.filter((l) => l.margem).reduce((a, b) => a + b.margem, 0) / lotes.filter((l) => l.margem).length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Produção de manteiga"
        subtitle="Lotes, rendimento e margem por batelada"
        action={<Button className="bg-gradient-primary"><Plus className="mr-1 size-4" /> Novo lote</Button>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Produção (semana)" value={totalKg} suffix="kg" icon={Factory} tone="primary" />
        <KpiCard label="Margem média" value={margemMedia} suffix="%" icon={TrendingUp} tone="gold" />
        <KpiCard label="Lote em andamento" value={1} icon={Clock} tone="info" />
      </div>

      <ChartCard title="Produção × Lucro semanal" subtitle="Quilos de manteiga e lucro diário">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyProduction} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis yAxisId="l" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
              <Bar yAxisId="l" dataKey="kg" name="Manteiga (kg)" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              <Bar yAxisId="l" dataKey="lucro" name="Lucro (R$)" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Histórico de lotes">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2">Lote</th><th>Data</th><th>Leite (L)</th><th>Creme (kg)</th>
                <th>Manteiga (kg)</th><th>Rend.</th><th>Custo/kg</th><th>Margem</th><th>Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lotes.map((l) => (
                <tr key={l.id} className="hover:bg-muted/40">
                  <td className="py-3 font-mono text-xs">{l.id}</td>
                  <td>{l.data}</td>
                  <td>{l.leite}</td>
                  <td>{l.creme}</td>
                  <td className="font-semibold">{l.kg || "—"}</td>
                  <td>{l.rendimento ? `${l.rendimento}%` : "—"}</td>
                  <td>{l.custoKg ? fmtBRL(l.custoKg) : "—"}</td>
                  <td>{l.margem ? `${l.margem}%` : "—"}</td>
                  <td>
                    <Badge variant={l.status === "Concluído" ? "secondary" : "outline"}>{l.status}</Badge>
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
