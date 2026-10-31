import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PRO_AMOUNT, PRO_CURRENCY, PRO_PRICE_ID, paidAccess } from "./billing-rules";

const environmentInput = z.object({ environment: z.enum(["sandbox", "live"]) });
const checkoutInput = environmentInput.extend({ returnUrl: z.string().url() });

export const createMonthlyCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(checkoutInput)
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      const returnUrl = new URL(data.returnUrl);
      if (returnUrl.origin !== new URL(getRequest().url).origin || returnUrl.pathname !== "/app/assinatura") {
        throw new Error("Destino de pagamento inválido.");
      }
      const { data: profile, error } = await context.supabase.from("profiles").select("org_id").eq("id", context.userId).single();
      if (error || !profile.org_id) throw new Error("Empresa não encontrada.");
      const orgId = profile.org_id;
      const { data: admin, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _org_id: orgId, _role: "admin" });
      if (roleError || !admin) throw new Error("Apenas o administrador pode contratar a assinatura.");
      const { data: existing, error: existingError } = await context.supabase.from("stripe_subscriptions")
        .select("status,current_period_end").eq("org_id", orgId).eq("environment", data.environment);
      if (existingError) throw existingError;
      if (existing?.some(s => paidAccess(s.status, s.current_period_end))) throw new Error("Sua empresa já possui assinatura. Use Gerenciar assinatura.");
      const { data: { user }, error: userError } = await context.supabase.auth.getUser();
      if (userError || !user) throw new Error("Entre novamente para continuar.");
      const stripe = createStripeClient(data.environment);
      const prices = await stripe.prices.list({ lookup_keys: [PRO_PRICE_ID], active: true });
      const price = prices.data[0];
      if (!price || price.unit_amount !== PRO_AMOUNT || price.currency !== PRO_CURRENCY || price.recurring?.interval !== "month") {
        throw new Error("Preço mensal não configurado corretamente.");
      }
      const { resolveOrCreateCustomer } = await import("./billing.server");
      const customer = await resolveOrCreateCustomer(stripe, { userId: context.userId, email: user.email });
      const subscriptions = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
      if (subscriptions.data.some(s => s.metadata.orgId === orgId && !["canceled", "incomplete_expired"].includes(s.status))) {
        throw new Error("Já existe uma assinatura ou pagamento pendente para esta empresa.");
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: reservations, error: reserveError } = await supabaseAdmin.rpc("reserve_stripe_checkout", { _org: orgId, _env: data.environment });
      const reservation = reservations?.[0];
      if (reserveError || !reservation) throw new Error("Não foi possível iniciar o pagamento.");
      if (reservation.stripe_session_id) {
        const existingSession = await stripe.checkout.sessions.retrieve(reservation.stripe_session_id);
        if (existingSession.status === "open" && existingSession.client_secret) return { clientSecret: existingSession.client_secret };
        throw new Error("Pagamento já enviado. Aguarde a confirmação ou tente novamente mais tarde.");
      }
      const session = await stripe.checkout.sessions.create({
        customer, customer_update: { address: "auto" },
        line_items: [{ price: price.id, quantity: 1 }],
        mode: "subscription", ui_mode: "embedded_page", locale: "pt-BR",
        return_url: data.returnUrl, automatic_tax: { enabled: true },
        metadata: { userId: context.userId, orgId, managed_payments: "false" },
        subscription_data: { metadata: { userId: context.userId, orgId } },
      }, { idempotencyKey: `lacto360-${data.environment}-${reservation.request_id}` });
      const { error: saveError } = await supabaseAdmin.from("stripe_checkout_reservations")
        .update({ stripe_session_id: session.id }).eq("org_id", orgId).eq("environment", data.environment).eq("request_id", reservation.request_id);
      if (saveError) throw saveError;
      if (!session.client_secret) throw new Error("Pagamento sem formulário disponível.");
      return { clientSecret: session.client_secret };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });

export const confirmCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(environmentInput.extend({ sessionId: z.string().regex(/^cs_[a-zA-Z0-9_]+$/) }))
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      const stripe = createStripeClient(data.environment);
      const session = await stripe.checkout.sessions.retrieve(data.sessionId);
      const { data: profile } = await context.supabase.from("profiles").select("org_id").eq("id", context.userId).single();
      if (session.metadata?.userId !== context.userId || session.metadata?.orgId !== profile?.org_id) throw new Error("Pagamento não pertence à sua empresa.");
      if (session.status !== "complete" || session.payment_status === "unpaid" || !session.subscription) return { paid: false };
      const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const { syncStripeSubscription } = await import("./billing.server");
      await syncStripeSubscription(subscription, data.environment);
      return { paid: true };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });

export const createBillingPortal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).inputValidator(checkoutInput)
  .handler(async ({ data, context }) => {
    const { createStripeClient, getStripeErrorMessage } = await import("./stripe.server");
    try {
      if (new URL(data.returnUrl).origin !== new URL(getRequest().url).origin) throw new Error("Destino inválido.");
      const { data: profile } = await context.supabase.from("profiles").select("org_id").eq("id", context.userId).single();
      if (!profile?.org_id) throw new Error("Empresa não encontrada.");
      const { data: admin } = await context.supabase.rpc("has_role", { _user_id: context.userId, _org_id: profile.org_id, _role: "admin" });
      if (!admin) throw new Error("Apenas o administrador pode gerenciar a assinatura.");
      const { data: sub, error } = await context.supabase.from("stripe_subscriptions").select("stripe_customer_id")
        .eq("org_id", profile.org_id).eq("environment", data.environment).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error || !sub) throw new Error("Nenhuma assinatura encontrada.");
      const portal = await createStripeClient(data.environment).billingPortal.sessions.create({ customer: sub.stripe_customer_id, return_url: data.returnUrl });
      return { url: portal.url };
    } catch (error) { return { error: getStripeErrorMessage(error) }; }
  });