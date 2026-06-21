import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// ---------------- MFA TOTP ----------------

export type MfaFactor = {
  id: string;
  friendly_name: string | null;
  factor_type: string;
  status: string;
  created_at: string;
};

async function listFactors(): Promise<MfaFactor[]> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const all = [...(data.totp ?? []), ...(data.phone ?? [])];
  return all.map((f) => ({
    id: f.id,
    friendly_name: f.friendly_name ?? null,
    factor_type: f.factor_type,
    status: f.status,
    created_at: f.created_at,
  }));
}

export const securityApi = {
  useFactors: () =>
    useQuery({ queryKey: ["mfa", "factors"], queryFn: listFactors }),

  useEnrollTotp: () => {
    return useMutation({
      mutationFn: async (friendlyName: string) => {
        const { data, error } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: friendlyName || `Lacto360 ${new Date().toLocaleDateString("pt-BR")}`,
        });
        if (error) throw error;
        return {
          factorId: data.id,
          qrCode: data.totp.qr_code,
          secret: data.totp.secret,
          uri: data.totp.uri,
        };
      },
    });
  },

  useVerifyTotp: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: { factorId: string; code: string }) => {
        const ch = await supabase.auth.mfa.challenge({ factorId: input.factorId });
        if (ch.error) throw ch.error;
        const v = await supabase.auth.mfa.verify({
          factorId: input.factorId,
          challengeId: ch.data.id,
          code: input.code.replace(/\s/g, ""),
        });
        if (v.error) throw v.error;
        return true;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ["mfa", "factors"] }),
    });
  },

  useUnenrollFactor: () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (factorId: string) => {
        const { error } = await supabase.auth.mfa.unenroll({ factorId });
        if (error) throw error;
      },
      onSuccess: () => qc.invalidateQueries({ queryKey: ["mfa", "factors"] }),
    });
  },

  useSignOutAll: () => {
    return useMutation({
      mutationFn: async () => {
        const { error } = await supabase.auth.signOut({ scope: "global" });
        if (error) throw error;
      },
    });
  },
};

// ---------------- Backup / Export ----------------

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export type BackupTable =
  | "customers"
  | "sales_orders"
  | "finance_entries"
  | "inventory_items";

export async function exportTableCsv(table: BackupTable, orgId: string) {
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .eq("org_id", orgId);
  if (error) throw error;
  const stamp = new Date().toISOString().slice(0, 10);
  download(`lacto360_${table}_${stamp}.csv`, toCsv(data ?? []));
  return (data ?? []).length;
}