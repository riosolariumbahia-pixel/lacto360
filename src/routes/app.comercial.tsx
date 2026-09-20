import { createFileRoute } from "@tanstack/react-router";
import { Target, Percent, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartCard } from "@/components/app/chart-card";
import { PageHeader } from "@/components/app/page-header";
import { useSession } from "@/lib/session";
import { commercialApi, firstOfMonth } from "@/lib/commercial";
import { fmtBRL } from "@/lib/operations";
import { routeHead } from "@/lib/seo";

export const Route = createFileRoute("/app/comercial")({
  head: () => routeHead("Gestão comercial", "Acompanhe metas, comissões e desempenho da equipe comercial."),
  component: ComercialPage,
});

function ComercialPage() {
  const session = useSession();
  const orgId = session.orgId;
  const canWrite = session.role === "admin" || session.role === "sales_manager";
  const period = firstOfMonth();

  const sellersQ = useQuery({
    queryKey: ["sellers", orgId],
    queryFn: () => commercialApi.listSellers(orgId!),
    enabled: !!orgId,
  });
  const targetsQ = useQuery({
    queryKey: ["targets", orgId, period],
    queryFn: () => commercialApi.listTargets(period),
    enabled: !!orgId,
  });
  const commissionsQ = useQuery({
    queryKey: ["commissions", orgId],
    queryFn: () => commercialApi.listCommissions(),
    enabled: !!orgId,
  });
  const ordersQ = useQuery({
    queryKey: ["sales_orders", orgId],
    queryFn: () => commercialApi.listOrders(),
    enabled: !!orgId,
  });

  const sellers = (sellersQ.data ?? []).filter(
    (s) => s.role === "seller" || s.role === "sales_manager" || s.role === "admin"
  );
  const targetBy = useMemo(
    () => new Map((targetsQ.data ?? []).map((t) => [t.seller_id, t])),
    [targetsQ.data],
  );
  const commissionBy = useMemo(
    () => new Map((commissionsQ.data ?? []).map((c) => [c.seller_id, c])),
    [commissionsQ.data],
  );
  const monthRevenueBy = useMemo(() => {
    const m = new Map<string, number>();
    (ordersQ.data ?? []).forEach((o) => {
      if (o.ordered_at < period || o.status === "cancelado" || o.status === "rascunho") return;
      m.set(o.seller_id, (m.get(o.seller_id) ?? 0) + Number(o.total));
    });
    return m;
  }, [ordersQ.data, period]);
  const deliveredRevenueBy = useMemo(() => {
    const m = new Map<string, number>();
    (ordersQ.data ?? []).forEach((o) => {
      if (o.ordered_at < period || o.status !== "entregue") return;
      m.set(o.seller_id, (m.get(o.seller_id) ?? 0) + Number(o.total));
    });
    return m;
  }, [ordersQ.data, period]);

  const loading = sellersQ.isLoading || targetsQ.isLoading || commissionsQ.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader title="Gestão comercial" subtitle={`Metas e comissões — ${new Date(period).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`} />

      {loading && (
        <div className="flex items-center justify-center rounded-2xl border bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Carregando…
        </div>
      )}

      {!loading && (
        <Tabs defaultValue="metas">
          <TabsList>
            <TabsTrigger value="metas"><Target className="mr-1 size-4" /> Metas</TabsTrigger>
            <TabsTrigger value="comissoes"><Percent className="mr-1 size-4" /> Comissões</TabsTrigger>
          </TabsList>

          <TabsContent value="metas" className="mt-4">
            <ChartCard title="Metas do mês por vendedor">
              {sellers.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Cadastre vendedores em Configurações para definir metas.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="py-2">Vendedor</th>
                        <th>Meta (R$)</th>
                        <th>Realizado</th>
                        <th className="w-1/3">Atingimento</th>
                        {canWrite && <th></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sellers.map((s) => {
                        const t = targetBy.get(s.id);
                        const target = Number(t?.target_brl ?? 0);
                        const realized = monthRevenueBy.get(s.id) ?? 0;
                        const pct = target > 0 ? Math.min(100, (realized / target) * 100) : 0;
                        return (
                          <tr key={s.id} className="hover:bg-muted/40">
                            <td className="py-3 font-medium">{s.full_name ?? s.id.slice(0, 8)}</td>
                            <td>{fmtBRL(target)}</td>
                            <td className="font-semibold">{fmtBRL(realized)}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                  <div className="h-full bg-gradient-primary" style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-muted-foreground">{pct.toFixed(0)}%</span>
                              </div>
                            </td>
                            {canWrite && orgId && (
                              <td>
                                <TargetEditor orgId={orgId} sellerId={s.id} period={period}
                                  current={{ target_kg: Number(t?.target_kg ?? 0), target_brl: target }} />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </TabsContent>

          <TabsContent value="comissoes" className="mt-4">
            <ChartCard title="Comissões — pedidos entregues no mês">
              {sellers.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Sem vendedores cadastrados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="py-2">Vendedor</th>
                        <th>% Comissão</th>
                        <th>Faturamento entregue</th>
                        <th>Comissão a pagar</th>
                        {canWrite && <th></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {sellers.map((s) => {
                        const c = commissionBy.get(s.id);
                        const pct = Number(c?.commission_percent ?? 0);
                        const delivered = deliveredRevenueBy.get(s.id) ?? 0;
                        const due = (delivered * pct) / 100;
                        return (
                          <tr key={s.id} className="hover:bg-muted/40">
                            <td className="py-3 font-medium">{s.full_name ?? s.id.slice(0, 8)}</td>
                            <td>{pct.toFixed(2)}%</td>
                            <td>{fmtBRL(delivered)}</td>
                            <td className="font-semibold text-success">{fmtBRL(due)}</td>
                            {canWrite && orgId && (
                              <td>
                                <CommissionEditor orgId={orgId} sellerId={s.id} current={pct} />
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </ChartCard>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function TargetEditor({
  orgId, sellerId, period, current,
}: { orgId: string; sellerId: string; period: string; current: { target_kg: number; target_brl: number } }) {
  const qc = useQueryClient();
  const [kg, setKg] = useState(String(current.target_kg));
  const [brl, setBrl] = useState(String(current.target_brl));
  const m = useMutation({
    mutationFn: () => commercialApi.upsertTarget(orgId, {
      seller_id: sellerId, period,
      target_kg: Number(kg) || 0, target_brl: Number(brl) || 0,
    }),
    onSuccess: () => {
      toast.success("Meta atualizada");
      qc.invalidateQueries({ queryKey: ["targets"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex items-center gap-2">
      <Input className="w-20" type="number" step="0.1" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="kg" />
      <Input className="w-28" type="number" step="0.01" value={brl} onChange={(e) => setBrl(e.target.value)} placeholder="R$" />
      <Button size="sm" disabled={m.isPending} onClick={() => m.mutate()}>
        {m.isPending && <Loader2 className="mr-1 size-3 animate-spin" />} Salvar
      </Button>
    </div>
  );
}

function CommissionEditor({
  orgId, sellerId, current,
}: { orgId: string; sellerId: string; current: number }) {
  const qc = useQueryClient();
  const [pct, setPct] = useState(String(current));
  const m = useMutation({
    mutationFn: () => commercialApi.upsertCommission(orgId, {
      seller_id: sellerId, commission_percent: Number(pct) || 0,
    }),
    onSuccess: () => {
      toast.success("Comissão atualizada");
      qc.invalidateQueries({ queryKey: ["commissions"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="flex items-center gap-2">
      <Input className="w-20" type="number" step="0.1" value={pct} onChange={(e) => setPct(e.target.value)} />
      <Button size="sm" disabled={m.isPending} onClick={() => m.mutate()}>
        {m.isPending && <Loader2 className="mr-1 size-3 animate-spin" />} Salvar
      </Button>
    </div>
  );
}
