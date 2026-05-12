import { createFileRoute } from "@tanstack/react-router";
import { Boxes, AlertTriangle, TrendingDown, Plus, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
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
import { ChartCard } from "@/components/app/chart-card";
import { KpiCard } from "@/components/app/kpi-card";
import { PageHeader } from "@/components/app/page-header";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { operationsApi, fmtNum, type InventoryItem } from "@/lib/operations";

export const Route = createFileRoute("/app/estoque")({ component: EstoquePage });

function EstoquePage() {
  const session = useSession();
  const orgId = session.orgId;
  const canWrite = session.role === "admin" || session.role === "op_manager";

  const items = useQuery({
    queryKey: ["inventory_items", orgId],
    queryFn: () => operationsApi.listItems(),
    enabled: !!orgId,
  });

  const list = items.data ?? [];
  const stats = useMemo(() => {
    const critical = list.filter((s) => s.stock_qty <= 0).length;
    const warn = list.filter((s) => s.stock_qty > 0 && s.stock_qty <= s.min_stock).length;
    return { critical, warn };
  }, [list]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque & insumos"
        subtitle="Produtos, insumos e embalagens em tempo real"
        action={canWrite ? <NewItemDialog orgId={orgId!} /> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Itens cadastrados" value={list.length} icon={Boxes} tone="primary" />
        <KpiCard label="Em alerta" value={stats.warn} icon={AlertTriangle} tone="warning" />
        <KpiCard label="Sem estoque" value={stats.critical} icon={TrendingDown} tone="info" />
      </div>

      {items.isLoading && (
        <div className="flex items-center justify-center rounded-2xl border bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Carregando estoque…
        </div>
      )}

      {!items.isLoading && list.length === 0 && (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <p className="font-serif text-2xl">Nenhum item cadastrado</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cadastre produtos como manteiga 200g, queijo coalho 500g e insumos para começar a controlar o estoque.
          </p>
          {canWrite && orgId && <div className="mt-5"><NewItemDialog orgId={orgId} /></div>}
        </div>
      )}

      {list.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((s) => {
            const status: "ok" | "warning" | "critical" =
              s.stock_qty <= 0 ? "critical" : s.stock_qty <= s.min_stock ? "warning" : "ok";
            const ratio = Math.min(100, (s.stock_qty / Math.max(s.min_stock * 2, 1)) * 100);
            const tone =
              status === "critical" ? "bg-destructive" : status === "warning" ? "bg-warning" : "bg-primary";
            return (
              <div key={s.id} className="rounded-2xl border bg-card p-5 hover-lift animate-fade-in-up">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{s.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {s.category === "insumo" ? "Insumo" : s.category === "embalagem" ? "Embalagem" : "Produto"}
                      {s.sku ? ` · ${s.sku}` : ""}
                    </p>
                  </div>
                  <Badge variant={status === "ok" ? "secondary" : status === "warning" ? "outline" : "destructive"}>
                    {status === "ok" ? "OK" : status === "warning" ? "Atenção" : "Zerado"}
                  </Badge>
                </div>
                <p className="mt-3 font-serif text-3xl">
                  {fmtNum(Number(s.stock_qty), 2)} <span className="text-sm text-muted-foreground">{s.unit}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Mínimo: {fmtNum(Number(s.min_stock), 2)} {s.unit}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full transition-all", tone)} style={{ width: `${ratio}%` }} />
                </div>
                {canWrite && orgId && (
                  <div className="mt-4 flex gap-2">
                    <MovementDialog orgId={orgId} item={s} kind="in" />
                    <MovementDialog orgId={orgId} item={s} kind="out" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {stats.warn + stats.critical > 0 && (
        <ChartCard title="Recomendação da IA" subtitle="Ações sugeridas para evitar parada de produção">
          <div className="rounded-xl border bg-warning/10 p-4 text-sm">
            <p className="font-medium text-warning">Reposição recomendada</p>
            <p className="mt-1 text-muted-foreground">
              {stats.critical} item(s) zerado(s) e {stats.warn} abaixo do mínimo. Programe a próxima compra de insumos.
            </p>
          </div>
        </ChartCard>
      )}
    </div>
  );
}

function NewItemDialog({ orgId }: { orgId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("produto");
  const [unit, setUnit] = useState("kg");
  const [sku, setSku] = useState("");
  const [cost, setCost] = useState("0");
  const [price, setPrice] = useState("0");
  const [stock, setStock] = useState("0");
  const [min, setMin] = useState("0");

  const m = useMutation({
    mutationFn: () =>
      operationsApi.createItem(orgId, {
        name,
        category,
        unit,
        sku: sku || null,
        cost_price: Number(cost) || 0,
        sale_price: Number(price) || 0,
        stock_qty: Number(stock) || 0,
        min_stock: Number(min) || 0,
      }),
    onSuccess: () => {
      toast.success("Item cadastrado");
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      setOpen(false);
      setName(""); setSku(""); setCost("0"); setPrice("0"); setStock("0"); setMin("0");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary"><Plus className="mr-1 size-4" /> Novo item</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cadastrar item</DialogTitle>
          <DialogDescription>Adicione um produto, insumo ou embalagem ao estoque.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Manteiga artesanal 200g" />
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="produto">Produto</SelectItem>
                <SelectItem value="insumo">Insumo</SelectItem>
                <SelectItem value="embalagem">Embalagem</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Unidade</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="kg">kg</SelectItem>
                <SelectItem value="un">un</SelectItem>
                <SelectItem value="l">L</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>SKU (opcional)</Label>
            <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="MTG-200" />
          </div>
          <div>
            <Label>Custo (R$)</Label>
            <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div>
            <Label>Preço de venda (R$)</Label>
            <Input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
          <div>
            <Label>Estoque inicial</Label>
            <Input type="number" step="0.001" value={stock} onChange={(e) => setStock(e.target.value)} />
          </div>
          <div>
            <Label>Estoque mínimo</Label>
            <Input type="number" step="0.001" value={min} onChange={(e) => setMin(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!name || m.isPending} onClick={() => m.mutate()} className="bg-gradient-primary">
            {m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Cadastrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MovementDialog({ orgId, item, kind }: { orgId: string; item: InventoryItem; kind: "in" | "out" }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState("0");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  const m = useMutation({
    mutationFn: () =>
      operationsApi.addMovement(orgId, {
        item_id: item.id,
        movement_type: kind,
        quantity: Number(qty) || 0,
        reference: reference || null,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success(kind === "in" ? "Entrada registrada" : "Saída registrada");
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      setOpen(false); setQty("0"); setReference(""); setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={kind === "in" ? "default" : "outline"} className={cn("flex-1", kind === "in" && "bg-success text-success-foreground hover:bg-success/90")}>
          {kind === "in" ? <ArrowDownToLine className="mr-1 size-3.5" /> : <ArrowUpFromLine className="mr-1 size-3.5" />}
          {kind === "in" ? "Entrada" : "Saída"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{kind === "in" ? "Registrar entrada" : "Registrar saída"}</DialogTitle>
          <DialogDescription>{item.name}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Quantidade ({item.unit})</Label>
            <Input type="number" step="0.001" value={qty} onChange={(e) => setQty(e.target.value)} />
          </div>
          <div>
            <Label>Referência (opcional)</Label>
            <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="NF 1234 / Pedido #87" />
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={Number(qty) <= 0 || m.isPending} onClick={() => m.mutate()} className="bg-gradient-primary">
            {m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
