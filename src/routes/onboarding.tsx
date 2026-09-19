import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Sparkles, Plus, X } from "lucide-react";
import { sessionApi, useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, type AppRole } from "@/lib/team";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

const steps = ["Seu laticínio", "Primeiro produto", "Equipe"];
const ROLES: AppRole[] = ["admin", "sales_manager", "op_manager", "finance_manager", "seller"];

type InviteRow = { email: string; role: AppRole };

function OnboardingPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [productName, setProductName] = useState("");
  const [productUnit, setProductUnit] = useState("kg");
  const [productPrice, setProductPrice] = useState("");
  const [invites, setInvites] = useState<InviteRow[]>([{ email: "", role: "seller" }]);

  useEffect(() => {
    if (!session.ready) return;
    if (!session.user) navigate({ to: "/login" });
    else if (session.onboarded) navigate({ to: "/app" });
    else if (!companyName && session.user.laticinio) setCompanyName(session.user.laticinio);
  }, [session.ready, session.user, session.onboarded, session.user?.laticinio, companyName, navigate]);

  async function finish() {
    if (!session.orgId || !session.user) {
      toast.error("Sua conta ainda está sendo carregada. Aguarde alguns segundos e tente novamente.");
      return;
    }
    const orgId = session.orgId;
    const userId = session.user.id;
    setSaving(true);
    try {
      if (companyName.trim() && companyName.trim() !== session.user.laticinio) {
        const { error } = await supabase
          .from("organizations")
          .update({ name: companyName.trim() })
          .eq("id", orgId);
        if (error) throw error;
      }
      if (productName.trim()) {
        const { error } = await supabase.from("inventory_items").insert({
          org_id: orgId,
          name: productName.trim(),
          unit: productUnit,
          sale_price: Number(productPrice) || 0,
          category: "produto",
        });
        if (error) throw error;
      }
      const validInvites = invites.filter((i) => i.email.includes("@"));
      if (validInvites.length) {
        const { error } = await supabase.from("invitations").insert(
          validInvites.map((i) => ({
            org_id: orgId,
            email: i.email.trim().toLowerCase(),
            role: i.role,
            invited_by: userId,
          })),
        );
        if (error) throw error;
      }
      await sessionApi.setOnboarded(true);
      toast.success("Tudo pronto! Bem-vindo ao SeuLaticínio 360.");
      navigate({ to: "/app" });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function updateInvite(idx: number, patch: Partial<InviteRow>) {
    setInvites((prev) => prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-gradient-primary"><Sparkles className="size-4 text-primary-foreground" /></div>
          <span className="text-sm font-semibold">SeuLaticínio 360</span>
        </div>
        <span className="text-xs text-muted-foreground">Passo {step + 1} de {steps.length}</span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <div className="mb-8 flex gap-2">
          {steps.map((_, i) => (
            <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-gradient-primary" : "bg-muted")} />
          ))}
        </div>

        <div className="rounded-3xl border bg-card p-8 animate-fade-in-up">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-serif text-3xl">Conte sobre seu laticínio</h2>
              <p className="text-sm text-muted-foreground">Esse nome aparece nos relatórios e documentos.</p>
              <div className="grid gap-3 pt-2">
                <div>
                  <Label>Nome do laticínio</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Laticínio Vale Verde" />
                </div>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-serif text-3xl">Cadastre seu primeiro produto</h2>
              <p className="text-sm text-muted-foreground">Pode pular e cadastrar depois em Estoque.</p>
              <div className="grid gap-3 pt-2">
                <div>
                  <Label>Nome do produto</Label>
                  <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="Queijo Minas Frescal" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Unidade</Label>
                    <Select value={productUnit} onValueChange={setProductUnit}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">kg</SelectItem>
                        <SelectItem value="un">un</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Preço de venda (R$)</Label>
                    <Input type="number" step="0.01" value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="45.00" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-serif text-3xl">Convide sua equipe</h2>
              <p className="text-sm text-muted-foreground">Opcional. Você pode adicionar mais depois em Equipe.</p>
              <div className="space-y-3 pt-2">
                {invites.map((row, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="email@empresa.com"
                      value={row.email}
                      onChange={(e) => updateInvite(i, { email: e.target.value })}
                      className="flex-1"
                    />
                    <Select value={row.role} onValueChange={(v) => updateInvite(i, { role: v as AppRole })}>
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {invites.length > 1 && (
                      <Button size="icon" variant="ghost" onClick={() => setInvites((p) => p.filter((_, j) => j !== i))}>
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {invites.length < 3 && (
                  <Button variant="outline" size="sm" onClick={() => setInvites((p) => [...p, { email: "", role: "seller" }])}>
                    <Plus className="size-3.5" /> Adicionar outro
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0 || saving}>Voltar</Button>
            {step < steps.length - 1 ? (
              <Button className="bg-gradient-primary" onClick={() => setStep(step + 1)}>Continuar</Button>
            ) : (
              <Button className="bg-gradient-primary" onClick={finish} disabled={saving || !session.ready}>
                {!session.ready ? "Carregando conta..." : saving ? "Salvando..." : "Concluir e entrar"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
