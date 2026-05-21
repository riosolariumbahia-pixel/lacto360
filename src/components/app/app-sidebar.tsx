import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3, Boxes, Brain, Factory, LayoutDashboard, LineChart, Target, UsersRound,
  Settings, ShoppingCart, Users, Wallet, Sparkles, Crown,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { trialDaysLeft, useSession } from "@/lib/session";
import { Button } from "@/components/ui/button";

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard; adminOnly?: boolean };

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Visão geral",
    items: [
      { title: "Dashboard", url: "/app", icon: LayoutDashboard },
      { title: "Relatórios", url: "/app/relatorios", icon: BarChart3 },
    ],
  },
  {
    label: "Operação",
    items: [
      { title: "Produção", url: "/app/producao", icon: Factory },
      { title: "Estoque", url: "/app/estoque", icon: Boxes },
      { title: "Vendas", url: "/app/vendas", icon: ShoppingCart },
      { title: "Clientes", url: "/app/clientes", icon: Users },
      { title: "Comercial", url: "/app/comercial", icon: Target },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { title: "Faturamento", url: "/app/financeiro", icon: Wallet },
      { title: "Lucro & DRE", url: "/app/relatorios", icon: LineChart },
    ],
  },
  {
    label: "Inteligência",
    items: [
      { title: "Assistente 360 IA", url: "/app/assistente", icon: Brain },
      { title: "Equipe", url: "/app/equipe", icon: UsersRound, adminOnly: true },
      { title: "Assinatura", url: "/app/assinatura", icon: Crown, adminOnly: true },
      { title: "Configurações", url: "/app/configuracoes", icon: Settings },
    ],
  },
];

export function AppSidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const session = useSession();
  const days = trialDaysLeft(session);
  const isPro = session.plan === "pro";
  const isAdmin = session.role === "admin";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b">
        <Link to="/app" className="flex items-center gap-2 px-2 py-2">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">SeuLaticínio</span>
            <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">360</span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.filter((it) => !it.adminOnly || isAdmin).map((item) => {
                  const active = path === item.url || (item.url !== "/app" && path.startsWith(item.url));
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                        <Link to={item.url}>
                          <item.icon className="size-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t group-data-[collapsible=icon]:hidden">
        {isPro ? (
          <div className="rounded-xl border bg-gradient-to-br from-gold/15 to-transparent p-3">
            <p className="text-xs font-semibold text-gold">Plano Pro ativo</p>
            <p className="mt-1 text-[11px] text-muted-foreground">Recursos completos liberados.</p>
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Trial Pro</p>
              <span className="text-[11px] text-muted-foreground">{days}d restantes</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-gradient-primary" style={{ width: `${((7 - days) / 7) * 100}%` }} />
            </div>
            <Button asChild size="sm" className="mt-3 w-full bg-gradient-gold text-gold-foreground hover:opacity-90">
              <Link to="/app/assinatura">Fazer upgrade</Link>
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
