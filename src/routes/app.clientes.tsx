import { createFileRoute } from "@tanstack/react-router";
import { Users, Plus, Loader2, Search, Pencil, MessageCircle } from "lucide-react";
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
import { useSession } from "@/lib/session";
import { commercialApi, firstOfMonth, type Customer } from "@/lib/commercial";
import { fmtBRL } from "@/lib/operations";
import { openWhatsapp, msgBoasVindas } from "@/lib/whatsapp";

export const Route = createFileRoute("/app/clientes")({ component: ClientesPage });

function ClientesPage() {
  const session = useSession();
  const orgId = session.orgId;
  const canWrite =
    session.role === "admin" ||
    session.role === "sales_manager" ||
    session.role === "seller";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | "ativo" | "inativo">("todos");

  const customers = useQuery({
    queryKey: ["customers", orgId],
    queryFn: () => commercialApi.listCustomers(),
    enabled: !!orgId,
  });
  const orders = useQuery({
    queryKey: ["sales_orders", orgId],
    queryFn: () => commercialApi.listOrders(),
    enabled: !!orgId,
  });

  const list = customers.data ?? [];
  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return list.filter((c) => {
      if (statusFilter !== "todos" && c.status !== statusFilter) return false;
      if (!term) return true;
      return c.name.toLowerCase().includes(term)
        || (c.doc?.toLowerCase().includes(term) ?? false)
        || (c.email?.toLowerCase().includes(term) ?? false);
    });
  }, [list, search, statusFilter]);

  const stats = useMemo(() => {
    const period = firstOfMonth();
    const ativos = list.filter((c) => c.status === "ativo").length;
    const monthOrders = (orders.data ?? []).filter(
      (o) => o.ordered_at >= period && o.status !== "cancelado"
    );
    const revenue = monthOrders.reduce((s, o) => s + Number(o.total), 0);
    const ticket = monthOrders.length ? revenue / monthOrders.length : 0;
    return { total: list.length, ativos, ticket };
  }, [list, orders.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        subtitle="Carteira, ticket e relacionamento"
        action={canWrite && orgId ? <CustomerDialog orgId={orgId} /> : undefined}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total de clientes" value={stats.total} icon={Users} tone="primary" />
        <KpiCard label="Ativos" value={stats.ativos} icon={Users} tone="gold" />
        <KpiCard label="Ticket médio (mês)" value={stats.ticket} format={fmtBRL} icon={Users} tone="info" />
      </div>

      <ChartCard title="Carteira de clientes">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-8" placeholder="Buscar por nome, CNPJ ou email…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="ativo">Ativos</SelectItem>
              <SelectItem value="inativo">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {customers.isLoading && (
          <div className="flex items-center justify-center p-10 text-sm text-muted-foreground">
            <Loader2 className="mr-2 size-4 animate-spin" /> Carregando…
          </div>
        )}

        {!customers.isLoading && filtered.length === 0 && (
          <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            {list.length === 0
              ? "Nenhum cliente cadastrado. Comece adicionando padarias, mercados ou distribuidores."
              : "Nenhum cliente encontrado com os filtros atuais."}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2">Cliente</th>
                  <th>Documento</th>
                  <th>Cidade</th>
                  <th>Telefone</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-muted/40">
                    <td className="py-3 font-medium">{c.name}</td>
                    <td className="text-muted-foreground">{c.doc ?? "—"}</td>
                    <td className="text-muted-foreground">
                      {c.city ? `${c.city}${c.state ? "/" + c.state : ""}` : "—"}
                    </td>
                    <td className="text-muted-foreground">{c.phone ?? "—"}</td>
                    <td>
                      <Badge variant={c.status === "ativo" ? "secondary" : "destructive"}>
                        {c.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {c.phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Abrir WhatsApp"
                            onClick={() => {
                              const ok = openWhatsapp(
                                c.phone,
                                msgBoasVindas(c.name.split(" ")[0], "nossa empresa"),
                              );
                              if (!ok) toast.error("Telefone inválido para WhatsApp.");
                            }}
                          >
                            <MessageCircle className="size-3.5 text-success" />
                          </Button>
                        )}
                        {canWrite && orgId && <CustomerDialog orgId={orgId} customer={c} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ChartCard>
    </div>
  );
}

function CustomerDialog({ orgId, customer }: { orgId: string; customer?: Customer }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customer?.name ?? "");
  const [doc, setDoc] = useState(customer?.doc ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [city, setCity] = useState(customer?.city ?? "");
  const [state, setState] = useState(customer?.state ?? "");
  const [status, setStatus] = useState<"ativo" | "inativo">(customer?.status ?? "ativo");
  const [creditLimit, setCreditLimit] = useState(String(customer?.credit_limit ?? 0));
  const [paymentTerms, setPaymentTerms] = useState(customer?.payment_terms ?? "");
  const [notes, setNotes] = useState(customer?.notes ?? "");

  const m = useMutation({
    mutationFn: async () => {
      const payload = {
        name, doc: doc || null, email: email || null, phone: phone || null,
        city: city || null, state: state || null, status,
        credit_limit: Number(creditLimit) || 0,
        payment_terms: paymentTerms || null, notes: notes || null,
      };
      if (customer) await commercialApi.updateCustomer(customer.id, payload);
      else await commercialApi.createCustomer(orgId, payload);
    },
    onSuccess: () => {
      toast.success(customer ? "Cliente atualizado" : "Cliente cadastrado");
      qc.invalidateQueries({ queryKey: ["customers"] });
      setOpen(false);
    },
    onError: (e: Error) => {
      const msg = e.message || "";
      if (/row-level security|permission/i.test(msg)) {
        toast.error("Sem permissão para esta operação. Verifique seu perfil de acesso.");
      } else {
        toast.error(`Não foi possível salvar: ${msg}`);
      }
      // Log detalhado para auditoria/dev
      console.error("[clientes] save error", e);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {customer
          ? <Button size="sm" variant="ghost"><Pencil className="size-3.5" /></Button>
          : <Button className="bg-gradient-primary"><Plus className="mr-1 size-4" /> Novo cliente</Button>}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          <DialogDescription>Padaria, mercado, distribuidor ou cliente final.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Label>Nome / Razão social</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label>CPF / CNPJ</Label>
            <Input value={doc} onChange={(e) => setDoc(e.target.value)} />
          </div>
          <div>
            <Label>Telefone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="col-span-2">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="col-span-2 grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div>
              <Label>UF</Label>
              <Input maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
            </div>
          </div>
          <div>
            <Label>Limite de crédito (R$)</Label>
            <Input type="number" step="0.01" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as "ativo" | "inativo")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label>Condição de pagamento</Label>
            <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="Ex.: 30 dias" />
          </div>
          <div className="col-span-2">
            <Label>Observações</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!name || m.isPending} onClick={() => m.mutate()} className="bg-gradient-primary">
            {m.isPending && <Loader2 className="mr-2 size-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
