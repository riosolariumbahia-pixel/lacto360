import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { RoleGate } from "@/components/app/role-gate";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { auditApi, TABLE_LABEL, type DeletedRecord, type SoftDeleteTable } from "@/lib/audit";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import { routeHead } from "@/lib/seo";

export const Route = createFileRoute("/app/admin/lixeira")({
  head: () => routeHead("Lixeira", "Consulte e restaure registros removidos no Lacto360."),
  component: () => (
    <RoleGate roles={["admin"]}>
      <TrashPage />
    </RoleGate>
  ),
});

function TrashPage() {
  const [rows, setRows] = useState<DeletedRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setRows(await auditApi.listDeleted());
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function restore(r: DeletedRecord) {
    setRestoring(r.id);
    try {
      await auditApi.restore(r.table_name as SoftDeleteTable, r.id);
      toast.success("Registro restaurado.");
      await load();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lixeira"
        subtitle="Registros removidos – restaure quando necessário"
        action={<Button variant="outline" onClick={load} disabled={loading}>Atualizar</Button>}
      />

      <div className="rounded-2xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Identificação</TableHead>
              <TableHead>Removido em</TableHead>
              <TableHead>Removido por</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow><TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                {loading ? "Carregando..." : "Lixeira vazia."}
              </TableCell></TableRow>
            )}
            {rows.map((r) => (
              <TableRow key={`${r.table_name}-${r.id}`}>
                <TableCell><Badge variant="outline">{TABLE_LABEL[r.table_name] ?? r.table_name}</Badge></TableCell>
                <TableCell>{r.label ?? r.id.slice(0, 8)}</TableCell>
                <TableCell className="text-xs">{new Date(r.deleted_at).toLocaleString("pt-BR")}</TableCell>
                <TableCell>{r.deleted_by_name ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => restore(r)}
                    disabled={restoring === r.id}
                  >
                    <RotateCcw className="size-3.5 mr-1" />
                    {restoring === r.id ? "Restaurando..." : "Restaurar"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}