import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle, MessageCircle, Sparkle, TrendingDown, Trophy, Package,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { RoleGate } from "@/components/app/role-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useSession } from "@/lib/session";
import { commercialApi } from "@/lib/commercial";
import { financeApi, isOverdue, entryRemaining } from "@/lib/finance";
import { openWhatsapp, msgCobranca } from "@/lib/whatsapp";
import { fmtBRL } from "@/lib/utils";
import { toast } from "sonner";
import { routeHead } from "@/lib/seo";

export const Route = createFileRoute("/app/admin/inteligencia")({
  head: () => routeHead("Inteligência de negócio", "Acompanhe oportunidades, cobranças e desempenho comercial do laticínio."),
  component: () => (
    <RoleGate roles={["admin"]}>
      <IntelligencePage />
    </RoleGate>
  ),
});

const INACTIVE_DAYS = 30;

function IntelligencePage() {
  const session = useSession();
  const empresa = session.user?.laticinio ?? "nossa empresa";

  const customersQ = useQuery({
    queryKey: ["customers", session.orgId],
    queryFn: () => commercialApi.listCustomers(),
    enabled: !!session.orgId,
  });
  const ordersQ = useQuery({
    queryKey: ["sales_orders", session.orgId],
    queryFn: () => commercialApi.listOrders(),
    enabled: !!session.orgId,
  });
  const entriesQ = useQuery({
    queryKey: ["finance_entries", session.orgId],
    queryFn: () => financeApi.listEntries(),
    enabled: !!session.orgId,
  });

  const customers = customersQ.data ?? [];
  const orders = ordersQ.data ?? [];
  const entries = entriesQ.data ?? [];

  // ----- Inactive customers (no order in last 30 days) -----
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - INACTIVE_DAYS);
    return d.toISOString().slice(0, 10);
  }, []);

  const lastOrderByCustomer = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of orders) {
      if (o.status === "cancelado") continue;
      const prev = map.get(o.customer_id);
      if (!prev || o.ordered_at > prev) map.set(o.customer_id, o.ordered_at);
    }
    return map;
  }, [orders]);

  const inactiveCustomers = useMemo(() => {
    return customers
      .filter((c) => c.status === "ativo")
      .map((c) => ({ customer: c, last: lastOrderByCustomer.get(c.id) ?? null }))
      .filter((x) => !x.last || x.last < cutoff)
      .sort((a, b) => (a.last ?? "0").localeCompare(b.last ?? "0"))
      .slice(0, 20);
  }, [customers, lastOrderByCustomer, cutoff]);

  // ----- Sellers ranking (current month) -----
  const period = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
  }, []);

  const sellersRanking = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const o of orders) {
      if (o.status === "cancelado" || o.ordered_at < period) continue;
      const key = o.seller_id ?? "—";
      const cur = map.get(key) ?? { total: 0, count: 0 };
      cur.total += Number(o.total);
      cur.count += 1;
      map.set(key, cur);
    }
    return [...map.entries()]
      .map(([id, v]) => ({ id, total: v.total, count: v.count }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [orders, period]);

  // ----- Overdue receivables -----
  const overdueReceivables = useMemo(() => {
    return entries
      .filter((e) => e.kind === "receivable" && e.status !== "pago" && e.status !== "cancelado" && isOverdue(e))
      .map((e) => ({
        entry: e,
        remaining: entryRemaining(e),
        customer: customers.find((c) => c.id === e.customer_id) ?? null,
      }))
      .sort((a, b) => a.entry.due_date.localeCompare(b.entry.due_date))
      .slice(0, 20);
  }, [entries, customers]);

  const totalOverdue = overdueReceivables.reduce((s, x) => s + x.remaining, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inteligência de Negócio"
        subtitle="Insights acionáveis para a operação do laticínio"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryTile
          icon={TrendingDown}
          label={`Clientes inativos (${INACTIVE_DAYS}d)`}
          value={String(inactiveCustomers.length)}
          tone="warning"
        />
        <SummaryTile
          icon={AlertTriangle}
          label="Contas a receber vencidas"
          value={fmtBRL(totalOverdue)}
          tone="danger"
        />
        <SummaryTile
          icon={Trophy}
          label="Vendedores ativos no mês"
          value={String(sellersRanking.length)}
          tone="primary"
        />
      </div>

      {/* Overdue receivables with WhatsApp action */}
      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h3 className="text-sm font-semibold">Cobrança via WhatsApp</h3>
            <p className="text-xs text-muted-foreground">
              Contas vencidas — clique no botão para enviar a mensagem pelo WhatsApp.
            </p>
          </div>
          <Badge variant="destructive">{overdueReceivables.length}</Badge>
        </div>
        {overdueReceivables.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            🎉 Nenhuma conta vencida no momento.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overdueReceivables.map(({ entry, remaining, customer }) => {
                const venc = new Date(entry.due_date).toLocaleDateString("pt-BR");
                const canMsg = !!customer?.phone;
                return (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{customer?.name ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.description ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">{venc}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {fmtBRL(remaining)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canMsg}
                        onClick={() => {
                          const ok = openWhatsapp(
                            customer?.phone,
                            msgCobranca(
                              customer?.name?.split(" ")[0] ?? "cliente",
                              fmtBRL(remaining),
                              venc,
                              empresa,
                            ),
                          );
                          if (!ok) toast.error("Cliente sem telefone válido.");
                        }}
                      >
                        <MessageCircle className="size-3.5" /> Cobrar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Inactive customers */}
      <div className="rounded-2xl border bg-card">
        <div className="flex items-center justify-between border-b p-5">
          <div>
            <h3 className="text-sm font-semibold">Clientes inativos</h3>
            <p className="text-xs text-muted-foreground">
              Sem pedidos há mais de {INACTIVE_DAYS} dias — oportunidade de reativação.
            </p>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link to="/app/clientes">Ver carteira</Link>
          </Button>
        </div>
        {inactiveCustomers.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Todos os clientes estão ativos. Excelente!
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead>Último pedido</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inactiveCustomers.map(({ customer, last }) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {customer.city ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {last ? new Date(last).toLocaleDateString("pt-BR") : "Nunca"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!customer.phone}
                      onClick={() => {
                        const ok = openWhatsapp(
                          customer.phone,
                          `Olá ${customer.name.split(" ")[0]}! Estamos com saudades. Que tal renovar seu pedido com a ${empresa}?`,
                        );
                        if (!ok) toast.error("Cliente sem telefone válido.");
                      }}
                    >
                      <MessageCircle className="size-3.5" /> Reativar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Sellers ranking */}
      <div className="rounded-2xl border bg-card">
        <div className="flex items-center gap-2 border-b p-5">
          <Trophy className="size-4 text-gold" />
          <h3 className="text-sm font-semibold">Ranking de vendedores — mês atual</h3>
        </div>
        {sellersRanking.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Sem vendas registradas neste mês.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead className="text-right">Pedidos</TableHead>
                <TableHead className="text-right">Faturado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sellersRanking.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`}
                  </TableCell>
                  <TableCell className="font-medium font-mono text-xs">
                    {s.id === "—" ? "—" : s.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-right">{s.count}</TableCell>
                  <TableCell className="text-right font-semibold">{fmtBRL(s.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

function SummaryTile({
  icon: Icon, label, value, tone,
}: {
  icon: typeof Sparkle;
  label: string;
  value: string;
  tone: "primary" | "warning" | "danger";
}) {
  const toneCls =
    tone === "danger" ? "text-destructive"
    : tone === "warning" ? "text-warning"
    : "text-primary";
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className={`size-4 ${toneCls}`} />
        {label}
      </div>
      <p className={`mt-2 font-serif text-3xl ${toneCls}`}>{value}</p>
    </div>
  );
}