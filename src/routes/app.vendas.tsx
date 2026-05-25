import { createFileRoute } from "@tanstack/react-router";
import { ShoppingCart, TrendingUp, Package, Plus, Loader2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChartCard, ChartTooltip } from "@/components/app/chart-card";
import { KpiCard } from "@/components/app/kpi-card";
import { PageHeader } from "@/components/app/page-header";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useSession } from "@/lib/session";
import { commercialApi, firstOfMonth, type OrderChannel, type OrderStatus, type SalesOrder } from "@/lib/commercial";
import { operationsApi, fmtBRL, fmtNum, type InventoryItem } from "@/lib/operations";

export const Route = createFileRoute("/app/vendas")({ component: VendasPage });

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const STATUS_LABEL: Record<OrderStatus, string> = {
  rascunho: "Rascunho", confirmado: "Confirmado", em_rota: "Em rota",
  entregue: "Entregue", cancelado: "Cancelado",
};
const CHANNEL_LABEL: Record<OrderChannel, string> = {
  balcao: "Balcão", rota: "Rota", whatsapp: "WhatsApp", distribuidor: "Distribuidor",
};

function VendasPage() {
  const session = useSession();
  const orgId = session.orgId;
  const role = session.role;
  const canWrite = role === "admin" || role === "sales_manager" || role === "seller";

  const orders = useQuery({
    queryKey: ["sales_orders", orgId],
    queryFn: () => commercialApi.listOrders(),
    enabled: !!orgId,
  });
  const customers = useQuery({
    queryKey: ["customers", orgId],
    queryFn: () => commercialApi.listCustomers(),
    enabled: !!orgId,
  });
  const items = useQuery({
    queryKey: ["inventory_items", orgId],
    queryFn: () => operationsApi.listItems(),
    enabled: !!orgId,
  });
  const sellers = useQuery({
    queryKey: ["sellers", orgId],
    queryFn: () => commercialApi.listSellers(orgId!),
    enabled: !!orgId,
  });

  const customerById = useMemo(
    () => new Map((customers.data ?? []).map((c) => [c.id, c.name])),
    [customers.data],
  );
  const sellerById = useMemo(
    () => new Map((sellers.data ?? []).map((s) => [s.id, s.full_name ?? "—"])),
    [sellers.data],
  );

  const list = orders.data ?? [];
  const stats = useMemo(() => {
    const period = firstOfMonth();
    const month = list.filter((o) => o.ordered_at >= period && o.status !== "cancelado");
    const revenue = month.reduce((s, o) => s + Number(o.total), 0);
    const ticket = month.length ? revenue / month.length : 0;
    return { count: month.length, revenue, ticket };
  }, [list]);

  const channelData = useMemo(() => {
    const counts: Record<OrderChannel, number> = { balcao: 0, rota: 0, whatsapp: 0, distribuidor: 0 };
    list.forEach((o) => { if (o.status !== "cancelado") counts[o.channel]++; });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return (Object.keys(counts) as OrderChannel[]).map((k) => ({
      name: CHANNEL_LABEL[k], value: Math.round((counts[k] / total) * 100),
    })).filter((d) => d.value > 0);
  }, [list]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas & pedidos"
        subtitle="Pedidos, canais e performance comercial"
        action={canWrite && orgId ? (
          <NewOrderDialog
            orgId={orgId}
            currentUserId={session.user?.id ?? ""}
            isSeller={role === "seller"}
            customers={customers.data ?? []}
            items={items.data ?? []}
            sellers={(sellers.data ?? []).filter((s) => s.role === "seller" || s.role === "sales_manager" || s.role === "admin")}
          />
        ) : undefined}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Pedidos no mês" value={stats.count} icon={ShoppingCart} tone="primary" />
        <KpiCard label="Faturamento (mês)" value={stats.revenue} format={fmtBRL} icon={TrendingUp} tone="gold" />
        <KpiCard label="Ticket médio" value={stats.ticket} format={fmtBRL} icon={Package} tone="info" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ChartCard title="Pedidos recentes" className="lg:col-span-2">
          {orders.isLoading && (
            <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Carregando…
            </div>
          )}
          {!orders.isLoading && list.length === 0 && (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Nenhum pedido registrado ainda.
            </div>
          )}
          {list.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2">Pedido</th>
                    <th>Cliente</th>
                    <th>Vendedor</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Data</th>
                    {canWrite && <th></th>}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.slice(0, 30).map((o) => (
                    <tr key={o.id} className="hover:bg-muted/40">
                      <td className="py-3 font-mono text-xs">{o.code}</td>
                      <td className="font-medium">{customerById.get(o.customer_id) ?? "—"}</td>
                      <td className="text-muted-foreground">{sellerById.get(o.seller_id) ?? "—"}</td>
                      <td className="font-semibold">{fmtBRL(Number(o.total))}</td>
                      <td><StatusBadge status={o.status} /></td>
                      <td className="text-muted-foreground">
                        {new Date(o.ordered_at).toLocaleDateString("pt-BR")}
                      </td>
                      {canWrite && <td><OrderActions order={o} /></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Canais">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={channelData.length ? channelData : [{ name: "Sem dados", value: 1 }]}
                  dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {(channelData.length ? channelData : [{ name: "—", value: 1 }]).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip format={(v: number) => `${v}%`} />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {channelData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{s.name}</span>
                <span className="ml-auto font-semibold">{s.value}%</span>
              </div>
            ))}
            {channelData.length === 0 && (
              <p className="text-muted-foreground">Sem pedidos para exibir.</p>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const variant: "secondary" | "outline" | "destructive" | "default" =
    status === "entregue" ? "secondary" :
    status === "cancelado" ? "destructive" :
    status === "rascunho" ? "outline" : "default";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}

function OrderActions({ order }: { order: SalesOrder }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: (status: OrderStatus) => commercialApi.updateOrderStatus(order.id, status),
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["sales_orders"] });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const next: OrderStatus[] = order.status === "rascunho" ? ["confirmado", "cancelado"]
    : order.status === "confirmado" ? ["em_rota", "entregue", "cancelado"]
    : order.status === "em_rota" ? ["entregue", "cancelado"]
    : [];
  if (next.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost">Ações</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {next.map((s) => (
          <DropdownMenuItem key={s} onClick={() => m.mutate(s)}>
            Marcar como {STATUS_LABEL[s].toLowerCase()}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NewOrderDialog({
  orgId, currentUserId, isSeller, customers, items, sellers,
}: {
  orgId: string;
  currentUserId: string;
  isSeller: boolean;
  customers: { id: string; name: string }[];
  items: InventoryItem[];
  sellers: { id: string; full_name: string | null }[];
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState("");
  const [sellerId, setSellerId] = useState(currentUserId);
  const [channel, setChannel] = useState<OrderChannel>("balcao");
  const [discount, setDiscount] = useState("0");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<{ item_id: string; quantity: string; unit_price: string }[]>(
    [{ item_id: "", quantity: "1", unit_price: "0" }]
  );

  const subtotal = lines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unit_price) || 0), 0);
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  function setLine(idx: number, patch: Partial<typeof lines[number]>) {
    setLines((arr) => arr.map((l, i) => i === idx ? { ...l, ...patch } : l));
  }
  function addLine() {
    setLines((arr) => [...arr, { item_id: "", quantity: "1", unit_price: "0" }]);
  }
  function removeLine(idx: number) {
    setLines((arr) => arr.length > 1 ? arr.filter((_, i) => i !== idx) : arr);
  }
  function pickItem(idx: number, itemId: string) {
    const it = items.find((i) => i.id === itemId);
    setLine(idx, { item_id: itemId, unit_price: it ? String(it.sale_price) : "0" });
  }

  const m = useMutation({
    mutationFn: (confirm: boolean) => commercialApi.createOrder(orgId, {
      customer_id: customerId,
      seller_id: sellerId,
      channel,
      discount: Number(discount) || 0,
      notes: notes || null,
      items: lines
        .filter((l) => l.item_id && Number(l.quantity) > 0)
        .map((l) => ({
          item_id: l.item_id,
          quantity: Number(l.quantity),
          unit_price: Number(l.unit_price),
        })),
      confirm,
    }),
    onSuccess: () => {
      toast.success("Pedido criado");
      qc.invalidateQueries({ queryKey: ["sales_orders"] });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      setOpen(false);
      setCustomerId(""); setDiscount("0"); setNotes("");
      setLines([{ item_id: "", quantity: "1", unit_price: "0" }]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const valid = !!customerId && !!sellerId
    && lines.some((l) => l.item_id && Number(l.quantity) > 0);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary"><Plus className="mr-1 size-4" /> Novo pedido</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo pedido de venda</DialogTitle>
          <DialogDescription>Selecione cliente, itens e confirme para baixar o estoque.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Cliente</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {customers.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vendedor</Label>
            <Select value={sellerId} onValueChange={setSellerId} disabled={isSeller}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {sellers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.full_name ?? s.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Canal</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as OrderChannel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CHANNEL_LABEL) as OrderChannel[]).map((k) => (
                  <SelectItem key={k} value={k}>{CHANNEL_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Desconto (R$)</Label>
            <Input type="number" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
          </div>
        </div>

        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label>Itens</Label>
            <Button size="sm" variant="outline" onClick={addLine}>
              <Plus className="mr-1 size-3.5" /> Linha
            </Button>
          </div>
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <div className="col-span-6">
                <Select value={l.item_id} onValueChange={(v) => pickItem(i, v)}>
                  <SelectTrigger><SelectValue placeholder="Produto…" /></SelectTrigger>
                  <SelectContent>
                    {items.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Nenhum produto cadastrado. Vá em Estoque para adicionar.
                      </div>
                    )}
                    {items.filter((it) => it.is_active).map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        {it.name} ({fmtNum(Number(it.stock_qty), 2)} {it.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input className="col-span-2" type="number" step="0.001" placeholder="Qtd"
                value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
              <Input className="col-span-3" type="number" step="0.01" placeholder="Preço un."
                value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} />
              <Button size="icon" variant="ghost" className="col-span-1" onClick={() => removeLine(i)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div>
          <Label>Observações</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
          <span className="text-muted-foreground">Subtotal {fmtBRL(subtotal)} · Desconto {fmtBRL(Number(discount) || 0)}</span>
          <span className="font-semibold">Total {fmtBRL(total)}</span>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={!valid || m.isPending} onClick={() => m.mutate(false)}>
            {m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Salvar rascunho
          </Button>
          <Button disabled={!valid || m.isPending} onClick={() => m.mutate(true)} className="bg-gradient-primary">
            {m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Confirmar pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
