# Architecture rules
- Stripe access uses the shared gateway utility and authenticated server functions; private keys never enter browser code.
- Billing is scoped to organization and payment environment; sandbox payments must never modify live company access.
- Stripe-managed access is derived from stored verified subscription state, while existing non-Stripe Pro organizations retain their legacy access.
- Checkout creation uses a durable organization/environment reservation and Stripe idempotency to prevent duplicate subscriptions.
- Billing portal sessions select a dedicated policy configuration derived from tested billing rules rather than relying on Stripe account defaults.