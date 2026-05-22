import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Topbar } from "@/components/app/topbar";
import { trialDaysLeft, useSession } from "@/lib/session";
import { Sparkles } from "lucide-react";
import { TrialBanner } from "@/components/app/trial-banner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!session.ready) return;
    if (!session.user) navigate({ to: "/login" });
    else if (!session.onboarded) navigate({ to: "/onboarding" });
    else if (
      session.plan === "trial" &&
      trialDaysLeft(session) <= 0 &&
      path !== "/app/assinatura"
    ) {
      navigate({ to: "/app/assinatura" });
    }
  }, [session.ready, session.user, session.onboarded, session.plan, session.trialEndsAt, path, navigate]);

  useEffect(() => {
    if (!session.user) return;
    const tables = [
      "sales_orders", "sales_order_items", "finance_entries", "finance_payments",
      "production_butter", "production_cheese", "customers", "inventory_items", "inventory_movements",
    ];
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["rep"] });
    };
    const channel = supabase.channel("dashboard-realtime");
    for (const t of tables) {
      channel.on("postgres_changes", { event: "*", schema: "public", table: t }, invalidate);
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session.user, queryClient]);

  if (!session.ready || !session.user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Sparkles className="size-4 animate-pulse" />
          <span className="text-sm">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <TrialBanner />
          <main className="flex-1 p-4 md:p-6">
            <Outlet />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
