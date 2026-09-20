import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app/page-header";
import { sessionApi, trialDaysLeft, useSession } from "@/lib/session";
import { toast } from "sonner";
import { SecurityCard } from "@/components/app/security-card";
import { BackupCard } from "@/components/app/backup-card";
import { routeHead } from "@/lib/seo";

export const Route = createFileRoute("/app/configuracoes")({
  head: () => routeHead("Configurações", "Gerencie sua conta, segurança, plano e preferências."),
  component: ConfigPage,
});

const proPerks = [
  "Assistente 360 IA ilimitado",
  "Relatórios avançados e exportação",
  "Integrações com sistemas fiscais",
  "Suporte prioritário",
];

function ConfigPage() {
  const session = useSession();
  const days = trialDaysLeft(session);
  const navigate = useNavigate();
  const isAdmin = session.role === "admin";
  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" subtitle="Conta, plano e preferências" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-5">
          <h3 className="text-sm font-semibold">Perfil</h3>
          <div className="mt-4 grid gap-3">
            <div><Label>Nome</Label><Input defaultValue={session.user?.name} /></div>
            <div><Label>E-mail</Label><Input defaultValue={session.user?.email} /></div>
            <div><Label>Laticínio</Label><Input defaultValue={session.user?.laticinio} /></div>
            <Button className="mt-2 w-fit bg-gradient-primary" onClick={() => toast.success("Perfil atualizado")}>Salvar</Button>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-gold/10 via-card to-card p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-gold" />
            <h3 className="text-sm font-semibold">Plano {session.plan === "pro" ? "Pro" : "Trial"}</h3>
          </div>
          {session.plan === "pro" ? (
            <>
              <p className="mt-2 text-sm text-muted-foreground">Você está no plano Pro. Aproveite todos os recursos.</p>
              <div className="mt-5">
                <Button variant="outline" onClick={async () => { await sessionApi.signOut(); navigate({ to: "/" }); }}>
                  Sair
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="mt-2 font-serif text-3xl">{days} <span className="text-base text-muted-foreground">dias restantes</span></p>
              <p className="mt-1 text-sm text-muted-foreground">Após o trial, escolha um plano para manter tudo funcionando.</p>
              <ul className="mt-4 space-y-2 text-sm">
                {proPerks.map((p) => (
                  <li key={p} className="flex items-center gap-2"><Check className="size-4 text-primary" />{p}</li>
                ))}
              </ul>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button className="bg-gradient-gold text-gold-foreground" onClick={async () => { await sessionApi.upgrade(); toast.success("Bem-vindo ao Pro!"); }}>
                  Fazer upgrade — R$ 97/mês
                </Button>
                <Button variant="outline" onClick={async () => { await sessionApi.signOut(); navigate({ to: "/" }); }}>
                  Sair
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <SecurityCard />
        {isAdmin && <BackupCard />}
      </div>
    </div>
  );
}
