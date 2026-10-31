import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";
import { homeForRole, useSession, type AppRole } from "@/lib/session";

export function RoleGate({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  const session = useSession();
  const navigate = useNavigate();
  const denied = session.ready && (!session.role || !roles.includes(session.role));
  useEffect(() => {
    if (!denied) return;
    toast.error("Seu perfil não tem permissão para acessar esta área.");
    navigate({ to: homeForRole(session.role) });
  }, [denied, session.role, navigate]);
  if (!session.ready) return null;
  if (!session.role || !roles.includes(session.role)) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="max-w-md rounded-2xl border bg-card p-8 text-center">
          <ShieldAlert className="mx-auto size-10 text-destructive" />
          <h2 className="mt-4 text-lg font-semibold">Acesso restrito</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu perfil não tem permissão para visualizar esta área. Fale com um administrador
            se acredita que isso é um erro.
          </p>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}