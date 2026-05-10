import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { BarChart3, Boxes, Brain, Factory, LayoutDashboard, Settings, ShoppingCart, Users, Wallet } from "lucide-react";

const items = [
  { label: "Dashboard", to: "/app", icon: LayoutDashboard },
  { label: "Produção", to: "/app/producao", icon: Factory },
  { label: "Estoque", to: "/app/estoque", icon: Boxes },
  { label: "Vendas", to: "/app/vendas", icon: ShoppingCart },
  { label: "Clientes", to: "/app/clientes", icon: Users },
  { label: "Financeiro", to: "/app/financeiro", icon: Wallet },
  { label: "Relatórios", to: "/app/relatorios", icon: BarChart3 },
  { label: "Assistente 360 IA", to: "/app/assistente", icon: Brain },
  { label: "Configurações", to: "/app/configuracoes", icon: Settings },
];

export function CommandMenu({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar páginas, lotes, clientes…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Navegar">
          {items.map((it) => (
            <CommandItem
              key={it.to}
              onSelect={() => {
                onOpenChange(false);
                navigate({ to: it.to });
              }}
            >
              <it.icon className="mr-2 size-4" />
              {it.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
