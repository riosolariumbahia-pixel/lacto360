import { Bell, Command, Search } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { notifications } from "@/lib/mock-data";
import { useSession } from "@/lib/session";
import { CommandMenu } from "./command-menu";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function Topbar() {
  const session = useSession();
  const [openCmd, setOpenCmd] = useState(false);
  const initials = (session.user?.name ?? "U L")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-3 backdrop-blur md:px-5">
      <SidebarTrigger className="size-8" />
      <button
        onClick={() => setOpenCmd(true)}
        className="hidden h-9 flex-1 max-w-md items-center gap-2 rounded-lg border bg-muted/50 px-3 text-sm text-muted-foreground transition hover:bg-muted md:flex"
      >
        <Search className="size-4" />
        <span>Buscar lotes, clientes, pedidos…</span>
        <kbd className="ml-auto inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5 text-[10px]">
          <Command className="size-3" />K
        </kbd>
      </button>
      <div className="flex-1 md:hidden" />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-4" />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-warning" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="border-b p-3">
            <p className="text-sm font-semibold">Notificações inteligentes</p>
            <p className="text-xs text-muted-foreground">Eventos detectados pela IA</p>
          </div>
          <div className="max-h-80 divide-y overflow-auto">
            {notifications.map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-3">
                <span className={cn("mt-1 size-2 rounded-full",
                  n.tone === "warning" ? "bg-warning" : n.tone === "success" ? "bg-success" : "bg-info")} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <Avatar className="size-8 border">
        <AvatarFallback className="bg-gradient-primary text-xs font-semibold text-primary-foreground">
          {initials}
        </AvatarFallback>
      </Avatar>
      <CommandMenu open={openCmd} onOpenChange={setOpenCmd} />
    </header>
  );
}
