import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Check, Crown, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { sessionApi, trialDaysLeft, useSession } from "@/lib/session";
import { routeHead } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";
import { createMonthlyCheckout, confirmCheckout, createBillingPortal } from "@/lib/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { paidAccess } from "@/lib/billing-rules";
import { SubscriptionCheckout } from "@/components/app/subscription-checkout";

export const Route = createFileRoute("/app/assinatura")({
  head: () => routeHead("Assinatura", "Consulte e gerencie o plano do seu laticínio."),
  validateSearch: (search: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof search.session_id === "string" && /^cs_[a-zA-Z0-9_]+$/.test(search.session_id) ? search.session_id : undefined,
  }),
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
  const { session_id } = Route.useSearch();
  const queryClient = useQueryClient();
  const checkout = useServerFn(createMonthlyCheckout);
  const confirm = useServerFn(confirmCheckout);
  const portal = useServerFn(createBillingPortal);
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  const configured = token?.startsWith("pk_test_") || token?.startsWith("pk_live_");
  const { data: subscriptions, isPending, error: billingError } = useQuery({
    queryKey: ["stripe-billing", session.orgId, token?.startsWith("pk_test_") ? "sandbox" : "live"],
    enabled: !!session.orgId && session.role === "admin" && !!configured,
    queryFn: async () => {
      const { data, error } = await supabase.from("stripe_subscriptions").select("status,current_period_end,cancel_at_period_end")
        .eq("org_id", session.orgId ?? "").eq("environment", getStripeEnvironment()).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const billingActive = subscriptions?.some(s => paidAccess(s.status, s.current_period_end)) ?? false;
  const hasBilling = !!subscriptions?.length;
  const days = trialDaysLeft(session);
  const isPro = session.plan === "pro";
  const expired = !isPro && days <= 0;

  const inFlight = useRef(false);
  const confirmed = useRef<string | null>(null);

  useEffect(() => {
    if (!session_id || !session.ready || !session.user || !configured || confirmed.current === session_id) return;
    confirmed.current = session_id;
    setMessage("Confirmando pagamento...");
    void confirm({ data: { sessionId: session_id, environment: getStripeEnvironment() } }).then(async result => {
      if ("error" in result) throw new Error(result.error);
      setMessage(result.paid
        ? token?.startsWith("pk_test_") ? "Pagamento de teste confirmado. Nenhum valor real foi cobrado." : "Pagamento confirmado. Seu plano Pro está ativo."
        : "Pagamento aguardando confirmação. Seu plano será atualizado após a aprovação.");
      await sessionApi.refresh();
      await queryClient.invalidateQueries({ queryKey: ["stripe-billing"] });
    }).catch(error => setMessage(error instanceof Error ? error.message : "Não foi possível confirmar o pagamento."));
  }, [session_id, session.ready, session.user, configured, confirm, queryClient, token]);

  async function upgrade() {
    if (inFlight.current || billingActive || clientSecret) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const result = await checkout({ data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/app/assinatura?session_id={CHECKOUT_SESSION_ID}` } });
      if ("error" in result) throw new Error(result.error);
      setClientSecret(result.clientSecret);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao ativar. Tente novamente.");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  async function manage() {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const result = await portal({ data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/app/assinatura` } });
      if ("error" in result) throw new Error(result.error);
      window.open(result.url, "_blank", "noopener,noreferrer");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível abrir a assinatura."); }
    finally { inFlight.current = false; setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assinatura" subtitle="Seu plano e benefícios." />
      {!configured ? <div role="alert" className="border border-destructive/40 bg-destructive/10 p-4 text-sm">Os pagamentos reais ainda não foram ativados.</div>
        : token?.startsWith("pk_test_") ? <div role="status" className="border border-warning/40 bg-warning/10 p-4 text-sm">Ambiente de teste — nenhum valor real será cobrado.</div> : null}
      {message && <div role="status" className="border bg-muted p-4 text-sm">{message}</div>}
      {billingError && <div role="alert" className="text-sm text-destructive">Não foi possível consultar sua assinatura. Tente novamente.</div>}
      {subscriptions?.some(s => s.status === "past_due") && <p className="text-sm text-destructive">Pagamento pendente. Atualize a forma de pagamento em Gerenciar assinatura.</p>}
      {subscriptions?.find(s => s.cancel_at_period_end)?.current_period_end && <p className="text-sm text-muted-foreground">Cancelamento agendado. Acesso disponível até {new Date(subscriptions.find(s => s.cancel_at_period_end)?.current_period_end ?? "").toLocaleDateString("pt-BR")}.</p>}

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
            onClick={hasBilling ? manage : upgrade}
            disabled={loading || !!clientSecret || !configured || session.role !== "admin" || isPending || !!billingError}
            aria-busy={loading}
            className="mt-6 w-full bg-gradient-primary shadow-glow"
            size="lg"
          >
            {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
            {loading ? "Processando..." : hasBilling ? "Gerenciar assinatura" : clientSecret ? "Pagamento aberto" : "Assinar Pro"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Assinatura mensal de R$ 97. Cancele quando quiser.
          </p>
        </div>
      </div>

      {clientSecret && <SubscriptionCheckout clientSecret={clientSecret} />}

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