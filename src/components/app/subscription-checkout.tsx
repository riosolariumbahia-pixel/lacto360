import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";

export function SubscriptionCheckout({ clientSecret }: { clientSecret: string }) {
  return <section aria-label="Pagamento da assinatura" className="min-h-96">
    <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  </section>;
}