import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Activates the Pro plan for the caller's organization.
 * Pilot mode: no charge yet. Replace the body with a payment-provider confirmation when billing is connected.
 */
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: upErr } = await supabaseAdmin
      .from("organizations")
      .update({ plan: "pro" })
      .eq("id", profile.org_id);
    if (upErr) {
      console.error("[assinatura] falha ao ativar", upErr);
      throw new Error("Não foi possível ativar o plano agora.");
    }
    return { ok: true };
  });
