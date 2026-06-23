import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { acceptInvitationByToken, getInvitationByToken, ROLE_LABEL } from "@/lib/team";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/convite/$token")({ component: InvitePage });

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [accepting, setAccepting] = useState(false);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ok"; orgName: string; role: string; email: string }
    | { kind: "accepted"; email: string }
    | { kind: "expired" }
    | { kind: "missing" }
    | { kind: "error"; message: string }
  >({ kind: "loading" });

  useEffect(() => {
    let active = true;
    const timeout = window.setTimeout(() => {
      if (active) {
        console.error("[convite] timeout ao validar convite", { prefix: token.slice(0, 8) });
        setState({ kind: "error", message: "A validação demorou demais. Atualize a página ou peça um novo link." });
      }
    }, 12000);
    (async () => {
      try {
        console.info("[convite] iniciando validação", { prefix: token.slice(0, 8) });
        const { data: u, error: userError } = await supabase.auth.getUser();
        if (userError) console.warn("[convite] sessão ausente ou inválida", userError);
        if (!active) return;
        setCurrentEmail(u.user?.email ?? null);
        console.info("[convite] sessão verificada", { email: u.user?.email ?? null });
        const inv = await getInvitationByToken(token);
        if (!active) return;
        if (!inv) return setState({ kind: "missing" });
        if (inv.accepted_at) return setState({ kind: "accepted", email: inv.email });
        if (new Date(inv.expires_at) < new Date()) return setState({ kind: "expired" });
        console.info("[convite] convite válido", { id: inv.id, role: inv.role });
        setState({
          kind: "ok",
          orgName: inv.org_name,
          role: ROLE_LABEL[inv.role],
          email: inv.email,
        });
      } catch (err) {
        console.error("[convite] falha na validação", err);
        if (active) setState({ kind: "error", message: (err as Error).message || "Não foi possível validar este convite." });
      } finally {
        window.clearTimeout(timeout);
      }
    })();
    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [token]);

  async function acceptForLoggedIn() {
    setAccepting(true);
    try {
      await acceptInvitationByToken(token);
      console.info("[convite] redirecionando após aceite");
      toast.success("Convite aceito! Redirecionando…");
      window.location.assign("/app");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-hero p-6">
      <div className="w-full max-w-md rounded-3xl border bg-card p-8 shadow-elegant">
        <div className="mb-6 flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg bg-gradient-primary">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-semibold">SeuLaticínio 360</span>
        </div>

        {state.kind === "loading" && (
          <p className="text-sm text-muted-foreground">Validando convite...</p>
        )}

        {state.kind === "error" && (
          <div className="space-y-3 text-center">
            <AlertTriangle className="mx-auto size-8 text-destructive" />
            <h2 className="font-serif text-2xl">Falha ao validar convite</h2>
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Button variant="outline" className="mt-2" onClick={() => window.location.reload()}>Tentar novamente</Button>
          </div>
        )}

        {state.kind === "missing" && (
          <div className="space-y-3 text-center">
            <AlertTriangle className="mx-auto size-8 text-destructive" />
            <h2 className="font-serif text-2xl">Convite inválido</h2>
            <p className="text-sm text-muted-foreground">Este link não existe ou já foi usado.</p>
            <Button asChild variant="outline" className="mt-2"><Link to="/">Voltar ao início</Link></Button>
          </div>
        )}

        {state.kind === "accepted" && (
          <div className="space-y-3 text-center">
            <Check className="mx-auto size-8 text-primary" />
            <h2 className="font-serif text-2xl">Convite já aceito</h2>
            <p className="text-sm text-muted-foreground">A conta {state.email} já foi vinculada à equipe.</p>
            {currentEmail?.toLowerCase() === state.email.toLowerCase() ? (
              <Button className="mt-2 w-full bg-gradient-primary" onClick={() => window.location.assign("/app")}>Entrar no sistema</Button>
            ) : (
              <Button asChild className="mt-2 w-full bg-gradient-primary"><Link to="/login">Entrar</Link></Button>
            )}
          </div>
        )}

        {state.kind === "expired" && (
          <div className="space-y-3 text-center">
            <AlertTriangle className="mx-auto size-8 text-destructive" />
            <h2 className="font-serif text-2xl">Convite expirado</h2>
            <p className="text-sm text-muted-foreground">Peça à administradora um novo convite.</p>
            <Button asChild variant="outline" className="mt-2"><Link to="/">Voltar ao início</Link></Button>
          </div>
        )}

        {state.kind === "ok" && (
          <div className="space-y-4">
            <h1 className="font-serif text-3xl">Você foi convidado</h1>
            <p className="text-sm text-muted-foreground">
              Para participar de <span className="font-semibold text-foreground">{state.orgName}</span> como{" "}
              <span className="font-semibold text-foreground">{state.role}</span>.
            </p>
            <div className="rounded-xl border bg-muted/40 p-3 text-sm">
              <Check className="mr-2 inline size-3.5 text-primary" /> Convite para <span className="font-medium">{state.email}</span>
            </div>
            {currentEmail && currentEmail.toLowerCase() === state.email.toLowerCase() ? (
              <Button className="w-full bg-gradient-primary" disabled={accepting} onClick={acceptForLoggedIn}>
                {accepting ? "Aceitando…" : "Aceitar convite agora"}
              </Button>
            ) : currentEmail ? (
              <div className="space-y-2">
                <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                  Você está conectado como <b>{currentEmail}</b>. Saia e entre com <b>{state.email}</b> para aceitar este convite.
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }}
                >
                  Sair desta conta
                </Button>
              </div>
            ) : (
              <>
                <Button
                  className="w-full bg-gradient-primary"
                  onClick={() => navigate({ to: "/cadastro", search: { invite: token } })}
                >
                  Aceitar e criar conta
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Já tem conta?{" "}
                  <Link
                    to="/login"
                    search={{ invite: token } as never}
                    className="font-semibold text-primary"
                  >
                    Entrar
                  </Link>
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}