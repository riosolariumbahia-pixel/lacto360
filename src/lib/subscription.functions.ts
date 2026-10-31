import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Deprecated: access can only be granted after verified Stripe payment. */
export const activateProPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("org_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (error || !profile?.org_id) throw new Error("Organização não encontrada.");
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _org_id: profile.org_id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Apenas o administrador pode alterar a assinatura.");
    throw new Error("Para ativar o Pro, conclua o pagamento na página de assinatura.");
  });
