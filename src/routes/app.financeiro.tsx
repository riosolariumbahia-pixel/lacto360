import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Wallet, DollarSign, TrendingUp, ArrowDownToLine, ArrowUpFromLine,
  AlertCircle, Plus, Loader2, CheckCircle2, Tag, BarChart3, Receipt,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/session";
import { fmtBRL } from "@/lib/operations";
import {
  financeApi, entryRemaining, statusLabel, isOverdue,
  type FinanceEntry, type FinanceCategory, type FinanceEntryKind,
} from "@/lib/finance";

import { RoleGate } from "@/components/app/role-gate";

export const Route = createFileRoute("/app/financeiro")({
  component: () => (
    <RoleGate roles={["admin", "finance_manager"]}>
      <FinanceiroPage />
    </RoleGate>
  ),
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function FinanceiroPage() {
  const session = useSession();
  const orgId = session.orgId;
  const canWrite = session.role === "admin" || session.role === "finance_manager";

  const entriesQ = useQuery({
    queryKey: ["finance_entries", orgId],
    queryFn: () => financeApi.listEntries(),
    enabled: !!orgId,
  });
  const categoriesQ = useQuery({
    queryKey: ["finance_categories", orgId],
    queryFn: () => financeApi.listCategories(),
    enabled: !!orgId,
  });

  const entries = entriesQ.data ?? [];
  const categories = categoriesQ.data ?? [];
  const catBy = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const kpis = useMemo(() => computeKpis(entries), [entries]);
  const cashFlow = useMemo(() => computeCashFlow(entries), [entries]);
  const expensesByCat = useMemo(() => computeExpensesByCat(entries, catBy), [entries, catBy]);

  const loading = entriesQ.isLoading || categoriesQ.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        subtitle="Contas a pagar, a receber e fluxo de caixa"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Faturamento (mês)" value={kpis.revenueMonth} format={fmtBRL} icon={Wallet} tone="primary" />
        <KpiCard label="Despesa (mês)" value={kpis.expenseMonth} format={fmtBRL} icon={ArrowUpFromLine} tone="warning" />
        <KpiCard label="Lucro (mês)" value={kpis.profitMonth} format={fmtBRL} icon={DollarSign} tone="gold" />
        <KpiCard label="Margem" value={kpis.marginMonth} suffix="%" icon={TrendingUp} tone="info" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="A receber em aberto" value={kpis.openReceivable} format={fmtBRL} icon={ArrowDownToLine} tone="info" />
        <KpiCard label="A pagar em aberto" value={kpis.openPayable} format={fmtBRL} icon={ArrowUpFromLine} tone="warning" />
        <KpiCard label="Vencidos" value={kpis.overdue} format={fmtBRL} icon={AlertCircle} tone="warning" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-2xl border bg-card p-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 size-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview"><BarChart3 className="mr-1 size-4" /> Visão geral</TabsTrigger>
            <TabsTrigger value="receivable"><ArrowDownToLine className="mr-1 size-4" /> A receber</TabsTrigger>
            <TabsTrigger value="payable"><ArrowUpFromLine className="mr-1 size-4" /> A pagar</TabsTrigger>
            <TabsTrigger value="categories"><Tag className="mr-1 size-4" /> Categorias</TabsTrigger>
            <TabsTrigger value="reports"><Receipt className="mr-1 size-4" /> Relatórios</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            <ChartCard title="Receita × Despesa × Lucro" subtitle="Últimos 6 meses (realizado)">
              <div className="h-80">
                <ResponsiveContainer>
                  <AreaChart data={cashFlow}>
                    <defs>
                      <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-3)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--chart-3)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="mes" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip content={<ChartTooltip format={(v: number) => fmtBRL(v)} />} />
                    <Legend iconType="circle" />
                    <Area type="monotone" name="Receita" dataKey="receita" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#gRev)" />
                    <Area type="monotone" name="Despesa" dataKey="despesa" stroke="var(--chart-3)" strokeWidth={2.5} fill="url(#gExp)" />
                    <Area type="monotone" name="Lucro" dataKey="lucro" stroke="var(--chart-2)" strokeWidth={2.5} fill="url(#gPro)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </TabsContent>

          <TabsContent value="receivable" className="mt-4">
            <EntryList
              entries={entries.filter((e) => e.kind === "receivable")}
              categories={categories}
              kind="receivable"
              orgId={orgId}
              canWrite={canWrite}
            />
          </TabsContent>

          <TabsContent value="payable" className="mt-4">
            <EntryList
              entries={entries.filter((e) => e.kind === "payable")}
              categories={categories}
              kind="payable"
              orgId={orgId}
              canWrite={canWrite}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <CategoryManager categories={categories} orgId={orgId} canWrite={canWrite} />
          </TabsContent>

          <TabsContent value="reports" className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <ChartCard title="Despesas por categoria (mês)">
                <div className="h-72">
                  {expensesByCat.length === 0 ? (
                    <p className="p-6 text-center text-sm text-muted-foreground">Sem despesas no mês.</p>
                  ) : (
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={expensesByCat} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110} paddingAngle={3}>
                          {expensesByCat.map((d, i) => (
                            <Cell key={d.name} fill={d.color || COLORS[i % COLORS.length]} stroke="var(--card)" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip format={(v: number) => fmtBRL(v)} />} />
                        <Legend iconType="circle" />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </ChartCard>

              <ChartCard title="Top 10 despesas do mês">
                <div className="h-72">
                  <ResponsiveContainer>
                    <BarChart data={topExpenses(entries).map((e) => ({
                      name: e.description.slice(0, 18),
                      valor: Number(e.amount),
                    }))}>
                      <CartesianGrid stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                      <Tooltip content={<ChartTooltip format={(v: number) => fmtBRL(v)} />} cursor={{ fill: "var(--muted)" }} />
                      <Bar dataKey="valor" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ============ Lista de lançamentos (a pagar / a receber) ============

function EntryList({
  entries, categories, kind, orgId, canWrite,
}: {
  entries: FinanceEntry[];
  categories: FinanceCategory[];
  kind: FinanceEntryKind;
  orgId: string | null;
  canWrite: boolean;
}) {
  const [filter, setFilter] = useState<"todos" | "pendente" | "vencido" | "pago">("todos");

  const filtered = entries.filter((e) => {
    if (filter === "todos") return true;
    if (filter === "vencido") return isOverdue(e);
    if (filter === "pago") return e.status === "pago";
    return e.status === "pendente" || e.status === "parcial";
  });

  const catBy = new Map(categories.map((c) => [c.id, c]));
  const title = kind === "receivable" ? "Contas a receber" : "Contas a pagar";

  return (
    <ChartCard
      title={title}
      action={
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendente">Em aberto</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
            </SelectContent>
          </Select>
          {canWrite && orgId && <NewEntryDialog orgId={orgId} kind={kind} categories={categories} />}
        </div>
      }
    >
      {filtered.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">Nenhum lançamento.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2">Descrição</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Pago</th>
                <th>Status</th>
                {canWrite && <th></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((e) => {
                const st = statusLabel(e);
                const cat = e.category_id ? catBy.get(e.category_id) : null;
                return (
                  <tr key={e.id} className="hover:bg-muted/40">
                    <td className="py-3 font-medium">{e.description}</td>
                    <td>
                      {cat ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="size-2 rounded-full" style={{ background: cat.color }} />
                          {cat.name}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td>{new Date(e.due_date).toLocaleDateString("pt-BR")}</td>
                    <td className="font-semibold">{fmtBRL(Number(e.amount))}</td>
                    <td>{fmtBRL(Number(e.paid_amount))}</td>
                    <td>
                      <Badge variant="outline" className={cn(
                        st.tone === "ok" && "border-success/40 text-success",
                        st.tone === "warn" && "border-warning/40 text-warning",
                        st.tone === "danger" && "border-destructive/40 text-destructive",
                        st.tone === "muted" && "border-border text-muted-foreground",
                      )}>{st.label}</Badge>
                    </td>
                    {canWrite && orgId && (
                      <td>
                        <div className="flex justify-end gap-2">
                          {e.status !== "pago" && e.status !== "cancelado" && (
                            <PaymentDialog orgId={orgId} entry={e} />
                          )}
                        </div>
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
  );
}

// ============ Diálogo: novo lançamento ============

function NewEntryDialog({
  orgId, kind, categories,
}: { orgId: string; kind: FinanceEntryKind; categories: FinanceCategory[] }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryId, setCategoryId] = useState<string>("");
  const [supplier, setSupplier] = useState("");
  const [notes, setNotes] = useState("");

  const catKind = kind === "receivable" ? "receita" : "despesa";
  const cats = categories.filter((c) => c.kind === catKind);

  const m = useMutation({
    mutationFn: () => financeApi.createEntry(orgId, {
      kind,
      description,
      amount: Number(amount) || 0,
      due_date: dueDate,
      category_id: categoryId || null,
      supplier_name: supplier || null,
      notes: notes || null,
    }),
    onSuccess: () => {
      toast.success(kind === "receivable" ? "Conta a receber criada" : "Despesa registrada");
      qc.invalidateQueries({ queryKey: ["finance_entries"] });
      setOpen(false);
      setDescription(""); setAmount(""); setSupplier(""); setNotes(""); setCategoryId("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="mr-1 size-4" />
          {kind === "receivable" ? "Nova conta" : "Nova despesa"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{kind === "receivable" ? "Nova conta a receber" : "Nova despesa / conta a pagar"}</DialogTitle>
          <DialogDescription>Cadastro manual de lançamento financeiro.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {kind === "payable" && (
            <div>
              <Label>Fornecedor</Label>
              <Input value={supplier} onChange={(e) => setSupplier(e.target.value)} />
            </div>
          )}
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={m.isPending || !description || !amount}
            onClick={() => m.mutate()}
          >
            {m.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Diálogo: registrar pagamento ============

function PaymentDialog({ orgId, entry }: { orgId: string; entry: FinanceEntry }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const remaining = entryRemaining(entry);
  const [amount, setAmount] = useState(String(remaining));
  const [method, setMethod] = useState<string>("");
  const [notes, setNotes] = useState("");

  const m = useMutation({
    mutationFn: () => financeApi.registerPayment(orgId, {
      entry_id: entry.id,
      amount: Number(amount) || 0,
      method: method || null,
      notes: notes || null,
    }),
    onSuccess: () => {
      toast.success("Pagamento registrado");
      qc.invalidateQueries({ queryKey: ["finance_entries"] });
      setOpen(false);
      setNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setAmount(String(entryRemaining(entry))); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CheckCircle2 className="mr-1 size-4" /> Pagar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pagamento</DialogTitle>
          <DialogDescription>{entry.description} — restante {fmtBRL(remaining)}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Valor pago (R$)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Forma de pagamento</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={m.isPending || !amount} onClick={() => m.mutate()}>
            {m.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Categorias ============

function CategoryManager({
  categories, orgId, canWrite,
}: { categories: FinanceCategory[]; orgId: string | null; canWrite: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {(["receita", "despesa"] as const).map((kind) => (
        <ChartCard
          key={kind}
          title={kind === "receita" ? "Categorias de receita" : "Categorias de despesa"}
          action={canWrite && orgId ? <NewCategoryDialog orgId={orgId} kind={kind} /> : undefined}
        >
          <div className="divide-y">
            {categories.filter((c) => c.kind === kind).map((c) => (
              <div key={c.id} className="flex items-center gap-3 py-3">
                <span className="size-3 rounded-full" style={{ background: c.color }} />
                <span className="flex-1 text-sm font-medium">{c.name}</span>
              </div>
            ))}
            {categories.filter((c) => c.kind === kind).length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma categoria.</p>
            )}
          </div>
        </ChartCard>
      ))}
    </div>
  );
}

function NewCategoryDialog({ orgId, kind }: { orgId: string; kind: "receita" | "despesa" }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(kind === "receita" ? "#10b981" : "#ef4444");

  const m = useMutation({
    mutationFn: () => financeApi.createCategory(orgId, { name, kind, color }),
    onSuccess: () => {
      toast.success("Categoria criada");
      qc.invalidateQueries({ queryKey: ["finance_categories"] });
      setOpen(false); setName("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="mr-1 size-4" /> Nova</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova categoria</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>Cor</Label>
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20" />
          </div>
        </div>
        <DialogFooter>
          <Button disabled={m.isPending || !name} onClick={() => m.mutate()}>
            {m.isPending && <Loader2 className="mr-1 size-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Helpers ============

function startOfMonth(d = new Date()): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function computeKpis(entries: FinanceEntry[]) {
  const monthStart = startOfMonth();
  let revenueMonth = 0, expenseMonth = 0;
  let openReceivable = 0, openPayable = 0, overdue = 0;

  for (const e of entries) {
    if (e.status === "cancelado") continue;
    const paid = Number(e.paid_amount);
    const amount = Number(e.amount);

    // Realizado no mês = paid_at no mês corrente
    if (e.paid_at && new Date(e.paid_at) >= monthStart) {
      if (e.kind === "receivable") revenueMonth += paid;
      else expenseMonth += paid;
    }

    // Em aberto
    const remaining = Math.max(0, amount - paid);
    if (e.status !== "pago") {
      if (e.kind === "receivable") openReceivable += remaining;
      else openPayable += remaining;
      if (isOverdue(e)) overdue += remaining;
    }
  }

  const profitMonth = revenueMonth - expenseMonth;
  const marginMonth = revenueMonth > 0 ? Math.round((profitMonth / revenueMonth) * 100) : 0;

  return { revenueMonth, expenseMonth, profitMonth, marginMonth, openReceivable, openPayable, overdue };
}

function computeCashFlow(entries: FinanceEntry[]) {
  const months: { key: string; mes: string; receita: number; despesa: number; lucro: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      mes: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      receita: 0, despesa: 0, lucro: 0,
    });
  }
  const idx = new Map(months.map((m, i) => [m.key, i]));

  for (const e of entries) {
    if (e.status === "cancelado" || !e.paid_at) continue;
    const d = new Date(e.paid_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const i = idx.get(key);
    if (i === undefined) continue;
    const paid = Number(e.paid_amount);
    if (e.kind === "receivable") months[i].receita += paid;
    else months[i].despesa += paid;
  }
  months.forEach((m) => { m.lucro = m.receita - m.despesa; });
  return months;
}

function computeExpensesByCat(entries: FinanceEntry[], catBy: Map<string, FinanceCategory>) {
  const monthStart = startOfMonth();
  const map = new Map<string, { name: string; value: number; color: string }>();
  for (const e of entries) {
    if (e.kind !== "payable" || e.status === "cancelado") continue;
    if (!e.paid_at || new Date(e.paid_at) < monthStart) continue;
    const cat = e.category_id ? catBy.get(e.category_id) : null;
    const key = cat?.id ?? "__none";
    const cur = map.get(key) ?? { name: cat?.name ?? "Sem categoria", value: 0, color: cat?.color ?? "#64748b" };
    cur.value += Number(e.paid_amount);
    map.set(key, cur);
  }
  return Array.from(map.values()).sort((a, b) => b.value - a.value);
}

function topExpenses(entries: FinanceEntry[]) {
  const monthStart = startOfMonth();
  return entries
    .filter((e) => e.kind === "payable" && e.status !== "cancelado" && new Date(e.due_date) >= monthStart)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 10);
}
