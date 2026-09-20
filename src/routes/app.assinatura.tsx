import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Check, Crown, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sessionApi, trialDaysLeft, useSession } from "@/lib/session";
import { routeHead } from "@/lib/seo";

export const Route = createFileRoute("/app/assinatura")({
  head: () => routeHead("Assinatura", "Consulte e gerencie o plano do seu laticínio."),
  component: SubscriptionPage,
});

const PRO_PERKS = [
  "Produção, estoque, vendas e financeiro ilimitados",
  "Assistente 360 IA ilimitado",
  "Relatórios avançados com exportação",
  "Equipe ilimitada com papéis",
  "Suporte prioritário",
];

function SubscriptionPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const days = trialDaysLeft(session);
  const isPro = session.plan === "pro";
  const expired = !isPro && days <= 0;

  async function upgrade() {
    setLoading(true);
    try {
      await sessionApi.upgrade();
      toast.success("Plano Pro ativado! Bem-vindo.");
      navigate({ to: "/app" });
    } catch {
      toast.error("Falha ao ativar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assinatura" subtitle="Seu plano e benefícios." />

      {expired && (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5">
          <p className="text-sm font-semibold text-destructive">Seu período de avaliação terminou.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Faça upgrade para o Pro para continuar usando todos os recursos.
          </p>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Plano atual</p>
            <Badge variant={isPro ? "default" : "secondary"} className={isPro ? "bg-gradient-gold text-gold-foreground" : ""}>
              {isPro ? "Pro" : "Trial"}
            </Badge>
          </div>
          {isPro ? (
            <>
              <p className="mt-4 font-serif text-3xl">Plano Pro ativo</p>
              <p className="mt-1 text-sm text-muted-foreground">Recursos completos liberados.</p>
            </>
          ) : (
            <>
              <p className="mt-4 font-serif text-3xl">{days} dia{days === 1 ? "" : "s"} restantes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Aproveite todos os recursos do Pro durante o período de avaliação.
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-primary"
                  style={{ width: `${Math.min(100, ((7 - days) / 7) * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>

        <div className="relative rounded-2xl border bg-card p-6 ring-2 ring-primary shadow-glow">
          <Badge className="absolute -top-3 left-6 bg-gradient-primary">
            <Sparkles className="mr-1 size-3" /> Recomendado
          </Badge>
          <div className="flex items-center gap-2">
            <Crown className="size-5 text-gold" />
            <p className="text-sm font-semibold">Pro</p>
          </div>
          <p className="mt-2 font-serif text-4xl">
            R$ 97<span className="text-base text-muted-foreground">/mês</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Para o seu laticínio crescer sem limites.</p>
          <ul className="mt-5 space-y-2 text-sm">
            {PRO_PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <Button
            onClick={upgrade}
            disabled={isPro || loading}
            className="mt-6 w-full bg-gradient-primary shadow-glow"
            size="lg"
          >
            {isPro ? "Plano ativo" : loading ? "Ativando..." : "Fazer upgrade para Pro"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Cobrança real em breve — ative agora sem custo durante o piloto.
          </p>
        </div>
      </div>

      <div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/app">
            <ArrowLeft className="mr-1 size-4" /> Voltar ao dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}