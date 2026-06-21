import { useState } from "react";
import { Database, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { exportTableCsv, type BackupTable } from "@/lib/security";
import { useSession } from "@/lib/session";
import { toast } from "sonner";

const TABLES: { key: BackupTable; label: string }[] = [
  { key: "customers", label: "Clientes" },
  { key: "sales_orders", label: "Pedidos" },
  { key: "finance_entries", label: "Lançamentos financeiros" },
  { key: "inventory_items", label: "Itens de estoque" },
];

export function BackupCard() {
  const session = useSession();
  const [busy, setBusy] = useState<BackupTable | null>(null);

  async function handleExport(table: BackupTable) {
    if (!session.orgId) return;
    setBusy(table);
    try {
      const n = await exportTableCsv(table, session.orgId);
      toast.success(`${n} registros exportados.`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <Database className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Backup e exportação</h3>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Backups automáticos diários são mantidos pela infraestrutura Lacto360 com
        retenção mínima de 7 dias. Você também pode exportar manualmente os seus
        dados em CSV a qualquer momento.
      </p>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {TABLES.map((t) => (
          <Button
            key={t.key}
            variant="outline"
            className="justify-start"
            disabled={busy === t.key}
            onClick={() => handleExport(t.key)}
          >
            <Download className="size-4" />
            {busy === t.key ? "Exportando…" : t.label}
          </Button>
        ))}
      </div>
    </div>
  );
}