import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, Mail, RefreshCw, Trash2, UserPlus } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useSession } from "@/lib/session";
import { ROLE_LABEL, inviteLink, teamApi, type AppRole } from "@/lib/team";
import { toast } from "sonner";

export const Route = createFileRoute("/app/equipe")({ component: TeamPage });

const ROLES: AppRole[] = ["admin", "sales_manager", "op_manager", "finance_manager", "seller"];

function TeamPage() {
  const session = useSession();
  const orgId = session.orgId;
  const isAdmin = session.role === "admin";

  const members = teamApi.useMembers(orgId);
  const invites = teamApi.useInvitations(orgId);
  const createInvite = teamApi.useCreateInvitation(orgId);
  const revokeInvite = teamApi.useRevokeInvitation(orgId);
  const resendInvite = teamApi.useResendInvitation(orgId);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AppRole>("seller");

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader title="Equipe" subtitle="Membros e convites" />
        <div className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Apenas administradores podem gerenciar a equipe.
        </div>
      </div>
    );
  }

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }
    try {
      const inv = await createInvite.mutateAsync({ email, role });
      await navigator.clipboard.writeText(inviteLink(inv.token)).catch(() => {});
      toast.success("Convite criado — link copiado para a área de transferência.");
      setEmail("");
      setRole("seller");
      setOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(inviteLink(token));
    toast.success("Link copiado.");
  }

  async function resend(id: string) {
    try {
      const inv = await resendInvite.mutateAsync(id);
      await navigator.clipboard.writeText(inviteLink(inv.token)).catch(() => {});
      toast.success("Convite renovado por mais 7 dias — link copiado.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        subtitle="Membros ativos e convites pendentes"
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <UserPlus className="size-4" /> Convidar membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar membro</DialogTitle>
              </DialogHeader>
              <form onSubmit={submitInvite} className="space-y-4">
                <div>
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nome@empresa.com"
                    required
                  />
                </div>
                <div>
                  <Label>Papel</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createInvite.isPending} className="bg-gradient-primary">
                    {createInvite.isPending ? "Criando..." : "Criar convite"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h3 className="text-sm font-semibold">Membros ({members.data?.length ?? 0})</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Entrou em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.data?.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">{m.full_name ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{m.role ? ROLE_LABEL[m.role] : "—"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(m.created_at).toLocaleDateString("pt-BR")}
                </TableCell>
              </TableRow>
            ))}
            {members.data?.length === 0 && (
              <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground">Nenhum membro ainda.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-2xl border bg-card">
        <div className="border-b p-5">
          <h3 className="text-sm font-semibold">Convites ({invites.data?.length ?? 0})</h3>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.data?.map((inv) => (
              (() => {
                const status = inv.status ?? (inv.accepted_at ? "aceito" : new Date(inv.expires_at).getTime() < Date.now() ? "expirado" : "pendente");
                const canUseLink = status === "pendente";
                return (
              <TableRow key={inv.id}>
                <TableCell className="font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Mail className="size-3.5 text-muted-foreground" />
                    {inv.email}
                  </span>
                </TableCell>
                <TableCell><Badge variant="outline">{ROLE_LABEL[inv.role]}</Badge></TableCell>
                <TableCell>
                  <Badge variant={status === "aceito" ? "secondary" : status === "expirado" ? "destructive" : "outline"}>
                    {status[0].toUpperCase() + status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(inv.expires_at).toLocaleDateString("pt-BR")}
                </TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => copyLink(inv.token)} disabled={!canUseLink}>
                    <Copy className="size-3.5" /> Copiar link
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => resend(inv.id)}>
                    <RefreshCw className="size-3.5" /> Renovar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      revokeInvite.mutate(inv.id, {
                        onSuccess: () => toast.success("Convite revogado."),
                      });
                    }}
                  >
                    <Trash2 className="size-3.5 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
                );
              })()
            ))}
            {invites.data?.length === 0 && (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground">Nenhum convite cadastrado.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}