import { createFileRoute } from "@tanstack/react-router";
import { Boxes, AlertTriangle, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ChartCard } from "@/components/app/chart-card";
import { KpiCard } from "@/components/app/kpi-card";
import { kpis, stockItems } from "@/lib/mock-data";
import { PageHeader } from "@/components/app/page-header";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/estoque")({ component: EstoquePage });

function EstoquePage() {
  const critical = stockItems.filter((s) => s.status === "critical").length;
  const warn = stockItems.filter((s) => s.status === "warning").length;
  return (
    <div className="space-y-6">
      <PageHeader title="Estoque & insumos" subtitle="Leite, creme, sal, manteiga e embalagens"
        action={<Button className="bg-gradient-primary"><Plus className="mr-1 size-4" /> Entrada</Button>} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Itens monitorados" value={stockItems.length} icon={Boxes} tone="primary" />
        <KpiCard label="Itens em alerta" value={warn} icon={AlertTriangle} tone="warning" />
        <KpiCard label="Perdas (mês)" value={kpis.perdas} suffix="%" icon={TrendingDown} tone="info" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stockItems.map((s) => {
          const ratio = Math.min(100, (s.qty / Math.max(s.min * 2, 1)) * 100);
          const tone =
            s.status === "critical" ? "bg-destructive" : s.status === "warning" ? "bg-warning" : "bg-primary";
          return (
            <div key={s.item} className="rounded-2xl border bg-card p-5 hover-lift animate-fade-in-up">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{s.item}</p>
                <Badge variant={s.status === "ok" ? "secondary" : s.status === "warning" ? "outline" : "destructive"}>
                  {s.status === "ok" ? "OK" : s.status === "warning" ? "Atenção" : "Crítico"}
                </Badge>
              </div>
              <p className="mt-3 font-serif text-3xl">{s.qty.toLocaleString("pt-BR")} <span className="text-sm text-muted-foreground">{s.unit}</span></p>
              <p className="mt-1 text-xs text-muted-foreground">Mínimo: {s.min} {s.unit}</p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full", tone)} style={{ width: `${ratio}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {critical > 0 && (
        <ChartCard title="Recomendação da IA" subtitle="Ações sugeridas para evitar parada de produção">
          <div className="rounded-xl border bg-warning/10 p-4 text-sm">
            <p className="font-medium text-warning">Reposição urgente</p>
            <p className="mt-1 text-muted-foreground">
              Solicite embalagens de 200g hoje — consumo médio diário esgota estoque em ~36h.
            </p>
          </div>
        </ChartCard>
      )}
    </div>
  );
}
