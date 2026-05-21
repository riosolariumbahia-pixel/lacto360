import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Topbar } from "@/components/app/topbar";
import { trialDaysLeft, useSession } from "@/lib/session";
import { Sparkles } from "lucide-react";
import { TrialBanner } from "@/components/app/trial-banner";

export const Route = createFileRoute("/app")({ component: AppLayout });

function AppLayout() {
  const session = useSession();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

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
