import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { RoleGate } from "@/components/app/role-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { auditApi, TABLE_LABEL, AUDIT_TABLES, type AuditLog } from "@/lib/audit";
import { toast } from "sonner";
import { routeHead } from "@/lib/seo";

export const Route = createFileRoute("/app/admin/auditoria")({
  head: () => routeHead("Auditoria", "Consulte o histórico de alterações e ações realizadas no Lacto360."),
  component: () => (
    <RoleGate roles={["admin"]}>
      <AuditPage />
    </RoleGate>
  ),
});

function AuditPage() {
  const [rows, setRows] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [action, setAction] = useState<string>("all");
  const [table, setTable] = useState<string>("all");
  const [user, setUser] = useState("");
  const [detail, setDetail] = useState<AuditLog | null>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await auditApi.list({
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to + "T23:59:59").toISOString() : undefined,
        action: action !== "all" ? (action as AuditLog["action"]) : undefined,
        table_name: table !== "all" ? table : undefined,
        user_id: user || undefined,
        limit: 300,
      });
      setRows(data);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const userOptions = useMemo(() => {
    const map = new Map<string, string>();
    rows.forEach((r) => {
      if (r.user_id) map.set(r.user_id, r.user_name ?? r.user_id.slice(0, 8));
    });
    return Array.from(map.entries());
  }, [rows]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoria"
        subtitle="Registro completo de alterações no sistema"
      />

      <div className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-6">
        <div>
          <Label className="text-xs">De</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Até</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Ação</Label>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="INSERT">Criação</SelectItem>
              <SelectItem value="UPDATE">Alteração</SelectItem>
              <SelectItem value="DELETE">Exclusão</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Tabela</Label>
          <Select value={table} onValueChange={setTable}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {AUDIT_TABLES.map((t) => (
                <SelectItem key={t} value={t}>{TABLE_LABEL[t] ?? t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Usuário</Label>
          <Select value={user || "all"} onValueChange={(v) => setUser(v === "all" ? "" : v)}>
            <SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {userOptions.map(([id, name]) => (
                <SelectItem key={id} value={id}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button onClick={load} disabled={loading} className="w-full">
            {loading ? "Carregando..." : "Aplicar filtros"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Usuário</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Tabela</TableHead>
              <TableHead>Registro</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                Nenhum registro encontrado.
              </TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="text-xs">{new Date(r.created_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{r.user_name ?? "—"}</TableCell>
                <TableCell><Badge variant="outline">{r.user_role ?? "—"}</Badge></TableCell>
                <TableCell>
                  <Badge variant={r.action === "DELETE" ? "destructive" : r.action === "INSERT" ? "default" : "secondary"}>
                    {r.action}
                  </Badge>
                </TableCell>
                <TableCell>{TABLE_LABEL[r.table_name] ?? r.table_name}</TableCell>
                <TableCell className="font-mono text-[11px]">{r.record_id?.slice(0, 8)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => setDetail(r)}>Ver</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Detalhe da alteração</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold mb-1">Valor anterior</p>
                <pre className="max-h-[400px] overflow-auto rounded-md border bg-muted p-3 text-[11px]">
{JSON.stringify(detail.old_data ?? {}, null, 2)}
                </pre>
              </div>
              <div>
                <p className="text-xs font-semibold mb-1">Valor novo</p>
                <pre className="max-h-[400px] overflow-auto rounded-md border bg-muted p-3 text-[11px]">
{JSON.stringify(detail.new_data ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}