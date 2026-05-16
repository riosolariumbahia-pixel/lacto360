import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInvitationByToken, ROLE_LABEL } from "@/lib/team";

export const Route = createFileRoute("/convite/$token")({ component: InvitePage });

function InvitePage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ok"; orgName: string; role: string; email: string }
    | { kind: "expired" }
    | { kind: "missing" }
  >({ kind: "loading" });

  useEffect(() => {
    (async () => {
      const inv = await getInvitationByToken(token).catch(() => null);
      if (!inv) return setState({ kind: "missing" });
      if (inv.accepted_at || new Date(inv.expires_at) < new Date()) return setState({ kind: "expired" });
      setState({
        kind: "ok",
        orgName: inv.org_name,
        role: ROLE_LABEL[inv.role],
        email: inv.email,
      });
    })();
  }, [token]);

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

        {state.kind === "missing" && (
          <div className="space-y-3 text-center">
            <AlertTriangle className="mx-auto size-8 text-destructive" />
            <h2 className="font-serif text-2xl">Convite inválido</h2>
            <p className="text-sm text-muted-foreground">Este link não existe ou já foi usado.</p>
            <Button asChild variant="outline" className="mt-2"><Link to="/">Voltar ao início</Link></Button>
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
            <Button
              className="w-full bg-gradient-primary"
              onClick={() =>
                navigate({
                  to: "/cadastro",
                  search: { invite: token },
                })
              }
            >
              Aceitar e criar conta
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="font-semibold text-primary">Entrar</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}