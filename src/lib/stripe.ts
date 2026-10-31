import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { paymentEnvironment } from "./billing-rules";

const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
let stripePromise: Promise<Stripe | null> | null = null;
export function getStripeEnvironment() { return paymentEnvironment(clientToken); }
export function getStripe() {
  getStripeEnvironment();
  if (!clientToken) throw new Error("Pagamentos não configurados.");
  if (!stripePromise) stripePromise = loadStripe(clientToken);
  return stripePromise;
}