import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Requires a signed-in user whose organization has an active plan (Pro or valid trial). */
export const requireActiveSubscription = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("org_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (!profile?.org_id) throw new Response("Forbidden: no organization", { status: 403 });
    const { data: active } = await context.supabase.rpc("org_has_active_subscription", { _org: profile.org_id });
    if (!active) throw new Response("Payment required: subscription inactive", { status: 402 });
    return next({ context: { orgId: profile.org_id as string } });
  });
