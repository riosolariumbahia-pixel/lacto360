import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { useSession, type AppRole } from "@/lib/session";

export function RoleGate({ roles, children }: { roles: AppRole[]; children: ReactNode }) {
  const session = useSession();
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