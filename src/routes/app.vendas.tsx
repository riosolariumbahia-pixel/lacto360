import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, TrendingUp, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ChartCard, ChartTooltip } from "@/components/app/chart-card";
import { KpiCard } from "@/components/app/kpi-card";
import { fmtBRL, kpis, recentOrders, salesByChannel } from "@/lib/mock-data";
import { PageHeader } from "@/components/app/page-header";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/app/vendas")({ component: VendasPage });
const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

function VendasPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Vendas & pedidos" subtitle="Pedidos, canais e ticket médio"
        action={<Button className="bg-gradient-primary"><Plus className="mr-1 size-4" /> Novo pedido</Button>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Pedidos no mês" value={kpis.pedidosMes} icon={ShoppingCart} tone="primary" />
        <KpiCard label="Ticket médio" value={kpis.ticketMedio} format={fmtBRL} icon={TrendingUp} tone="gold" />
        <KpiCard label="Manteiga vendida" value={kpis.manteigaKg} suffix="kg" icon={Package} tone="info" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Pedidos recentes" className="lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr><th className="py-2">Pedido</th><th>Cliente</th><th>Quantidade</th><th>Total</th><th>Status</th><th>Data</th></tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/40">
                    <td className="py-3 font-mono text-xs">{o.id}</td>
                    <td className="font-medium">{o.cliente}</td>
                    <td>{o.kg} kg</td>
                    <td className="font-semibold">{fmtBRL(o.total)}</td>
                    <td>
                      <Badge variant={o.status === "Entregue" ? "secondary" : o.status === "Em rota" ? "outline" : "destructive"}>
                        {o.status}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground">{o.data}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ChartCard>

        <ChartCard title="Canais">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={salesByChannel} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {salesByChannel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--card)" strokeWidth={2} />)}
                </Pie>
                <Tooltip content={<ChartTooltip format={(v: number) => `${v}%`} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {salesByChannel.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: COLORS[i] }} />
                <span className="text-muted-foreground">{s.name}</span>
                <span className="ml-auto font-semibold">{s.value}%</span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
