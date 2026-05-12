import { createFileRoute } from "@tanstack/react-router";
import { Plus, Factory, TrendingUp, Droplets, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ChartCard, ChartTooltip } from "@/components/app/chart-card";
import { KpiCard } from "@/components/app/kpi-card";
import { PageHeader } from "@/components/app/page-header";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { useSession } from "@/lib/session";
import {
  operationsApi, fmtBRL, fmtNum, type ButterLot, type CheeseLot, type InventoryItem,
} from "@/lib/operations";

export const Route = createFileRoute("/app/producao")({
  component: ProducaoPage,
});

function ProducaoPage() {
  const session = useSession();
  const orgId = session.orgId;
  const canWrite = session.role === "admin" || session.role === "op_manager";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produção"
        subtitle="Lotes de manteiga e queijo coalho com rendimento e custo"
      />

      <Tabs defaultValue="butter" className="space-y-6">
        <TabsList>
          <TabsTrigger value="butter">Manteiga</TabsTrigger>
          <TabsTrigger value="cheese">Queijo coalho</TabsTrigger>
        </TabsList>
        <TabsContent value="butter" className="space-y-6">
          <ButterPanel orgId={orgId} canWrite={canWrite} />
        </TabsContent>
        <TabsContent value="cheese" className="space-y-6">
          <CheesePanel orgId={orgId} canWrite={canWrite} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ButterPanel({ orgId, canWrite }: { orgId: string | null; canWrite: boolean }) {
  const lots = useQuery({
    queryKey: ["production_butter", orgId],
    queryFn: () => operationsApi.listButter(),
    enabled: !!orgId,
  });
  const items = useQuery({
    queryKey: ["inventory_items", orgId],
    queryFn: () => operationsApi.listItems(),
    enabled: !!orgId,
  });
  const list = lots.data ?? [];
  const totalKg = list.reduce((a, b) => a + Number(b.butter_kg), 0);
  const yieldAvg = list.length ? list.reduce((a, b) => a + Number(b.yield_percent), 0) / list.length : 0;
  const lastWeek = useMemo(() => weeklySeries(list, "butter_kg"), [list]);

  return (
    <>
      <div className="flex items-center justify-end">
        {canWrite && orgId && <NewButterDialog orgId={orgId} items={items.data ?? []} />}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Produção total (kg)" value={Math.round(totalKg)} icon={Factory} tone="primary" />
        <KpiCard label="Rendimento médio" value={Math.round(yieldAvg)} suffix="%" icon={TrendingUp} tone="gold" />
        <KpiCard label="Lotes registrados" value={list.length} icon={Droplets} tone="info" />
      </div>

      <ChartCard title="Produção semanal" subtitle="Manteiga produzida (kg) por dia — últimos 7 dias">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lastWeek} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="kg" name="Manteiga (kg)" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <LotsTable
        lots={list}
        empty="Nenhum lote de manteiga registrado ainda."
        loading={lots.isLoading}
        kind="butter"
      />
    </>
  );
}

function CheesePanel({ orgId, canWrite }: { orgId: string | null; canWrite: boolean }) {
  const lots = useQuery({
    queryKey: ["production_cheese", orgId],
    queryFn: () => operationsApi.listCheese(),
    enabled: !!orgId,
  });
  const items = useQuery({
    queryKey: ["inventory_items", orgId],
    queryFn: () => operationsApi.listItems(),
    enabled: !!orgId,
  });
  const list = lots.data ?? [];
  const totalKg = list.reduce((a, b) => a + Number(b.cheese_kg), 0);
  const totalPieces = list.reduce((a, b) => a + Number(b.pieces), 0);
  const yieldAvg = list.length ? list.reduce((a, b) => a + Number(b.yield_percent), 0) / list.length : 0;
  const lastWeek = useMemo(() => weeklySeries(list, "cheese_kg"), [list]);

  return (
    <>
      <div className="flex items-center justify-end">
        {canWrite && orgId && <NewCheeseDialog orgId={orgId} items={items.data ?? []} />}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Produção total (kg)" value={Math.round(totalKg)} icon={Factory} tone="primary" />
        <KpiCard label="Rendimento médio" value={Math.round(yieldAvg)} suffix="%" icon={TrendingUp} tone="gold" />
        <KpiCard label="Peças produzidas" value={totalPieces} icon={Droplets} tone="info" />
      </div>

      <ChartCard title="Produção semanal" subtitle="Queijo coalho produzido (kg) por dia — últimos 7 dias">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lastWeek} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="kg" name="Queijo (kg)" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <LotsTable
        lots={list}
        empty="Nenhum lote de queijo coalho registrado ainda."
        loading={lots.isLoading}
        kind="cheese"
      />
    </>
  );
}

function weeklySeries(lots: Array<ButterLot | CheeseLot>, key: "butter_kg" | "cheese_kg") {
  const days: { day: string; kg: number; date: string }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      day: d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""),
      kg: 0,
      date: iso,
    });
  }
  for (const l of lots) {
    const slot = days.find((x) => x.date === l.produced_at);
    if (slot) slot.kg += Number((l as Record<string, unknown>)[key] ?? 0);
  }
  return days;
}

function LotsTable({ lots, empty, loading, kind }: {
  lots: Array<ButterLot | CheeseLot>;
  empty: string;
  loading: boolean;
  kind: "butter" | "cheese";
}) {
  return (
    <ChartCard title="Histórico de lotes">
      {loading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Carregando…
        </div>
      ) : lots.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2">Data</th>
                <th>Leite (L)</th>
                <th>{kind === "butter" ? "Manteiga (kg)" : "Queijo (kg)"}</th>
                {kind === "cheese" && <th>Peças</th>}
                <th>Perdas</th>
                <th>Rend.</th>
                <th>Custo total</th>
                <th>Custo/kg</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {lots.map((l) => {
                const outKg = kind === "butter" ? Number((l as ButterLot).butter_kg) : Number((l as CheeseLot).cheese_kg);
                const costKg = outKg > 0 ? Number(l.total_cost) / outKg : 0;
                return (
                  <tr key={l.id} className="hover:bg-muted/40">
                    <td className="py-3">{new Date(l.produced_at).toLocaleDateString("pt-BR")}</td>
                    <td>{fmtNum(Number(l.milk_liters), 0)}</td>
                    <td className="font-semibold">{fmtNum(outKg, 2)}</td>
                    {kind === "cheese" && <td>{(l as CheeseLot).pieces}</td>}
                    <td>{fmtNum(Number(l.loss_kg), 2)}</td>
                    <td>{fmtNum(Number(l.yield_percent), 1)}%</td>
                    <td>{fmtBRL(Number(l.total_cost))}</td>
                    <td>{fmtBRL(costKg)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </ChartCard>
  );
}

function NewButterDialog({ orgId, items }: { orgId: string; items: InventoryItem[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [milk, setMilk] = useState("0");
  const [butter, setButter] = useState("0");
  const [loss, setLoss] = useState("0");
  const [cost, setCost] = useState("0");
  const [outputId, setOutputId] = useState<string>("none");
  const [notes, setNotes] = useState("");

  const m = useMutation({
    mutationFn: () =>
      operationsApi.createButter(orgId, {
        produced_at: date,
        milk_liters: Number(milk) || 0,
        butter_kg: Number(butter) || 0,
        loss_kg: Number(loss) || 0,
        total_cost: Number(cost) || 0,
        output_item_id: outputId === "none" ? null : outputId,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success("Lote registrado");
      qc.invalidateQueries({ queryKey: ["production_butter"] });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      setOpen(false);
      setMilk("0"); setButter("0"); setLoss("0"); setCost("0"); setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary"><Plus className="mr-1 size-4" /> Novo lote</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lote — Manteiga</DialogTitle>
          <DialogDescription>O rendimento é calculado automaticamente.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Leite usado (L)</Label>
            <Input type="number" step="0.001" value={milk} onChange={(e) => setMilk(e.target.value)} />
          </div>
          <div>
            <Label>Manteiga produzida (kg)</Label>
            <Input type="number" step="0.001" value={butter} onChange={(e) => setButter(e.target.value)} />
          </div>
          <div>
            <Label>Perdas (kg)</Label>
            <Input type="number" step="0.001" value={loss} onChange={(e) => setLoss(e.target.value)} />
          </div>
          <div>
            <Label>Custo total (R$)</Label>
            <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Adicionar ao estoque (opcional)</Label>
            <Select value={outputId} onValueChange={setOutputId}>
              <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não adicionar</SelectItem>
                {items.filter((i) => i.category === "produto").map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={m.isPending} onClick={() => m.mutate()} className="bg-gradient-primary">
            {m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewCheeseDialog({ orgId, items }: { orgId: string; items: InventoryItem[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [milk, setMilk] = useState("0");
  const [cheese, setCheese] = useState("0");
  const [pieces, setPieces] = useState("0");
  const [loss, setLoss] = useState("0");
  const [cost, setCost] = useState("0");
  const [outputId, setOutputId] = useState<string>("none");
  const [notes, setNotes] = useState("");

  const m = useMutation({
    mutationFn: () =>
      operationsApi.createCheese(orgId, {
        produced_at: date,
        milk_liters: Number(milk) || 0,
        cheese_kg: Number(cheese) || 0,
        pieces: Number(pieces) || 0,
        loss_kg: Number(loss) || 0,
        total_cost: Number(cost) || 0,
        output_item_id: outputId === "none" ? null : outputId,
        notes: notes || null,
      }),
    onSuccess: () => {
      toast.success("Lote registrado");
      qc.invalidateQueries({ queryKey: ["production_cheese"] });
      qc.invalidateQueries({ queryKey: ["inventory_items"] });
      setOpen(false);
      setMilk("0"); setCheese("0"); setPieces("0"); setLoss("0"); setCost("0"); setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary"><Plus className="mr-1 size-4" /> Novo lote</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo lote — Queijo coalho</DialogTitle>
          <DialogDescription>O rendimento é calculado automaticamente.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Data</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Leite usado (L)</Label>
            <Input type="number" step="0.001" value={milk} onChange={(e) => setMilk(e.target.value)} />
          </div>
          <div>
            <Label>Queijo produzido (kg)</Label>
            <Input type="number" step="0.001" value={cheese} onChange={(e) => setCheese(e.target.value)} />
          </div>
          <div>
            <Label>Peças</Label>
            <Input type="number" step="1" value={pieces} onChange={(e) => setPieces(e.target.value)} />
          </div>
          <div>
            <Label>Perdas (kg)</Label>
            <Input type="number" step="0.001" value={loss} onChange={(e) => setLoss(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Custo total (R$)</Label>
            <Input type="number" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Adicionar ao estoque (opcional)</Label>
            <Select value={outputId} onValueChange={setOutputId}>
              <SelectTrigger><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Não adicionar</SelectItem>
                {items.filter((i) => i.category === "produto").map((i) => (
                  <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={m.isPending} onClick={() => m.mutate()} className="bg-gradient-primary">
            {m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
