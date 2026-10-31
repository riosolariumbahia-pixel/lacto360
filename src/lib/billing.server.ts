import { createStripeClient, type StripeEnv } from "./stripe.server";
import { paidAccess, PRO_PRICE_ID } from "./billing-rules";
import type Stripe from "stripe";

export async function resolveOrCreateCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { email?: string; userId?: string },
): Promise<string> {
  if (options.userId && !/^[a-zA-Z0-9_-]+$/.test(options.userId)) {
    throw new Error("Invalid userId");
  }
  if (options.userId) {
    const found = await stripe.customers.search({ query: `metadata['userId']:'${options.userId}'`, limit: 1 });
    if (found.data.length) return found.data[0].id;
  }
  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    if (existing.data.length) {
      const customer = existing.data[0];
      if (options.userId && customer.metadata?.userId !== options.userId) {
        await stripe.customers.update(customer.id, { metadata: { ...customer.metadata, userId: options.userId } });
      }
      return customer.id;
    }
  }
  const created = await stripe.customers.create({
    ...(options.email && { email: options.email }),
    ...(options.userId && { metadata: { userId: options.userId } }),
  });
  return created.id;
}

export async function syncStripeSubscription(subscription: Stripe.Subscription, environment: StripeEnv) {
  const orgId = subscription.metadata.orgId;
  const userId = subscription.metadata.userId;
  const item = subscription.items.data[0];
  if (!orgId || !userId || !item) throw new Error("Assinatura sem empresa ou usuário.");
  const priceId = item.price.lookup_key ?? item.price.metadata.lovable_external_id;
  if (priceId !== PRO_PRICE_ID) throw new Error("Plano de assinatura desconhecido.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const { error } = await supabaseAdmin.from("stripe_subscriptions").upsert({
    org_id: orgId, user_id: userId, environment,
    stripe_subscription_id: subscription.id, stripe_customer_id: customerId,
    price_id: priceId, status: subscription.status,
    current_period_end: item.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null,
    cancel_at_period_end: subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  }, { onConflict: "environment,stripe_subscription_id" });
  if (error) throw error;
  // Test payments are stored separately and must never grant live company access.
  if (environment === "live") {
    const { data: subscriptions, error: readError } = await supabaseAdmin.from("stripe_subscriptions")
      .select("status,current_period_end").eq("org_id", orgId).eq("environment", "live").eq("price_id", PRO_PRICE_ID);
    if (readError) throw readError;
    const active = subscriptions?.some(s => paidAccess(s.status, s.current_period_end)) ?? false;
    const { error: updateError } = await supabaseAdmin.from("organizations")
      .update({ plan: active ? "pro" : "trial", billing_provider: "stripe" }).eq("id", orgId);
    if (updateError) throw updateError;
  }
}