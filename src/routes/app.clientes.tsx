import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChartCard } from "@/components/app/chart-card";
import { KpiCard } from "@/components/app/kpi-card";
import { fmtBRL, kpis, topClients } from "@/lib/mock-data";
import { PageHeader } from "@/components/app/page-header";

export const Route = createFileRoute("/app/clientes")({ component: ClientesPage });

function ClientesPage() {
  const ativos = topClients.filter((c) => c.status === "Ativo").length;
  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" subtitle="Carteira, ticket e meta de relacionamento" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total de clientes" value={kpis.clientes} icon={Users} tone="primary" />
        <KpiCard label="Ativos no mês" value={ativos} icon={Users} tone="gold" />
        <KpiCard label="Ticket médio" value={kpis.ticketMedio} format={fmtBRL} icon={Users} tone="info" />
      </div>

      <ChartCard title="Carteira de clientes">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2">Cliente</th><th>Pedidos</th><th>Faturado</th><th className="w-1/3">Meta</th><th>Status</th></tr>
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
                  <td><Badge variant={c.status === "Ativo" ? "secondary" : "destructive"}>{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
