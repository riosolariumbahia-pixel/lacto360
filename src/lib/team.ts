import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export type Member = {
  id: string;
  full_name: string | null;
  role: AppRole | null;
  created_at: string;
};

export type Invitation = {
  id: string;
  email: string;
  role: AppRole;
  token: string;
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
};

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  sales_manager: "Gerente Comercial",
  op_manager: "Gerente Operações",
  finance_manager: "Gerente Financeiro",
  seller: "Vendedor",
  viewer: "Visualizador",
};

export function inviteLink(token: string) {
  if (typeof window === "undefined") return `/convite/${token}`;
  return `${window.location.origin}/convite/${token}`;
}

async function listMembers(orgId: string): Promise<Member[]> {
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, full_name, created_at")
    .eq("org_id", orgId);
  if (error) throw error;
  const { data: roles } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .eq("org_id", orgId);
  const roleMap = new Map((roles ?? []).map((r) => [r.user_id, r.role as AppRole]));
  return (profiles ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    role: roleMap.get(p.id) ?? null,
    created_at: p.created_at,
  }));
}

async function listInvitations(orgId: string): Promise<Invitation[]> {
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, token, created_at, expires_at, accepted_at")
    .eq("org_id", orgId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Invitation[];
}

export const teamApi = {
  useMembers: (orgId: string | null) =>
    useQuery({
      queryKey: ["team", "members", orgId],
      queryFn: () => listMembers(orgId!),
      enabled: !!orgId,
    }),
  useInvitations: (orgId: string | null) =>
    useQuery({
      queryKey: ["team", "invites", orgId],
      queryFn: () => listInvitations(orgId!),
      enabled: !!orgId,
    }),
  useCreateInvitation: (orgId: string | null) => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (input: { email: string; role: AppRole }) => {
        const { data: auth } = await supabase.auth.getUser();
        if (!orgId || !auth.user) throw new Error("Sessão inválida.");
        const { data, error } = await supabase
          .from("invitations")
          .insert({
            org_id: orgId,
            email: input.email.trim().toLowerCase(),
            role: input.role,
            invited_by: auth.user.id,
          })
          .select("id, email, role, token, created_at, expires_at, accepted_at")
          .single();
        if (error) throw error;
        return data as Invitation;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["team", "invites", orgId] });
      },
    });
  },
  useRevokeInvitation: (orgId: string | null) => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: async (id: string) => {
        const { error } = await supabase.from("invitations").delete().eq("id", id);
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ["team", "invites", orgId] });
      },
    });
  },
};

export async function getInvitationByToken(token: string) {
  const { data, error } = await supabase
    .from("invitations")
    .select("id, email, role, expires_at, accepted_at, org_id, organizations(name)")
    .eq("token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const orgRaw = data.organizations as { name: string } | { name: string }[] | null;
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw;
  return {
    id: data.id,
    email: data.email,
    role: data.role as AppRole,
    expires_at: data.expires_at,
    accepted_at: data.accepted_at,
    org_name: org?.name ?? "Equipe",
  };
}