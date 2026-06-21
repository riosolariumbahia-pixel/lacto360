import type { AppRole } from "./session";

export const ROUTE_ROLES: Record<string, AppRole[]> = {
  "/app": ["admin", "sales_manager", "op_manager", "finance_manager", "seller"],
  "/app/relatorios": ["admin"],
  "/app/producao": ["admin", "op_manager"],
  "/app/estoque": ["admin", "op_manager"],
  "/app/vendas": ["admin", "sales_manager", "seller"],
  "/app/clientes": ["admin", "sales_manager", "seller"],
  "/app/comercial": ["admin", "sales_manager", "seller"],
  "/app/financeiro": ["admin", "finance_manager"],
  "/app/assistente": ["admin", "sales_manager", "op_manager", "finance_manager", "seller"],
  "/app/equipe": ["admin"],
  "/app/assinatura": ["admin"],
  "/app/configuracoes": ["admin", "sales_manager", "op_manager", "finance_manager", "seller"],
  "/app/admin/auditoria": ["admin"],
  "/app/admin/lixeira": ["admin"],
  "/app/admin/inteligencia": ["admin"],
};

export function canAccess(path: string, role: AppRole | null): boolean {
  if (!role) return false;
  // Find the most specific matching route prefix
  const match = Object.keys(ROUTE_ROLES)
    .filter((p) => path === p || path.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0];
  if (!match) return true;
  return ROUTE_ROLES[match].includes(role);
}