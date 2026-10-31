import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: { handlers: { POST: async ({ request }) => {
    const environment = new URL(request.url).searchParams.get("env");
    if (environment !== "sandbox" && environment !== "live") return new Response("Invalid environment", { status: 400 });
    const { verifyWebhook, createStripeClient } = await import("@/lib/stripe.server");
    let event;
    try { event = await verifyWebhook(request, environment); }
    catch { return new Response("Invalid webhook signature", { status: 400 }); }
    try {
      const object = event.data.object;
      let subscriptionId: string | undefined;
      if (object.object === "subscription") subscriptionId = object.id;
      else if (object.object === "checkout.session") {
        if (object.payment_status !== "unpaid" && object.subscription) {
          subscriptionId = typeof object.subscription === "string" ? object.subscription : object.subscription.id;
        }
      } else if (object.object === "invoice") {
        const subscription = object.parent?.subscription_details?.subscription;
        if (subscription) subscriptionId = typeof subscription === "string" ? subscription : subscription.id;
      }
      if (subscriptionId) {
        // Fetch current state so retries or out-of-order events cannot roll back access.
        const subscription = await createStripeClient(environment).subscriptions.retrieve(subscriptionId);
        const { syncStripeSubscription } = await import("@/lib/billing.server");
        await syncStripeSubscription(subscription, environment);
      }
      return Response.json({ received: true });
    } catch (error) {
      console.error("[payments] event persistence failed", event.id, error);
      return new Response("Payment update failed", { status: 500 });
    }
  } } },
});