import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Check } from "lucide-react";
import { sessionApi, useSession } from "@/lib/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({ component: OnboardingPage });

const steps = ["Seu laticínio", "Produtos", "Meta mensal", "Plano"];

function OnboardingPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [meta, setMeta] = useState("50000");

  useEffect(() => {
    if (session.ready && !session.user) navigate({ to: "/login" });
  }, [session.ready, session.user, navigate]);

  function finish() {
    sessionApi.setOnboarded(true);
    navigate({ to: "/app" });
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
              <p className="text-sm text-muted-foreground">Vamos personalizar a experiência para você.</p>
              <div className="grid gap-3 pt-2">
                <div><Label>Nome do laticínio</Label><Input defaultValue={session.user?.laticinio} /></div>
                <div><Label>Cidade / UF</Label><Input placeholder="Ex.: Patos de Minas / MG" /></div>
                <div><Label>Quantos funcionários?</Label><Input type="number" placeholder="5" /></div>
              </div>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-serif text-3xl">O que você produz?</h2>
              <p className="text-sm text-muted-foreground">Marque tudo que se aplica.</p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                {["Manteiga", "Queijo", "Iogurte", "Leite pasteurizado", "Doce de leite", "Requeijão"].map((p, i) => (
                  <label key={p} className={cn("flex cursor-pointer items-center gap-2 rounded-xl border p-3 text-sm hover:bg-muted/50", i === 0 && "border-primary bg-primary/5")}>
                    <input type="checkbox" defaultChecked={i === 0} className="accent-primary" />
                    {p}
                  </label>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-serif text-3xl">Qual sua meta de faturamento mensal?</h2>
              <p className="text-sm text-muted-foreground">Vamos te ajudar a chegar lá.</p>
              <div className="pt-2">
                <Label>Meta (R$)</Label>
                <Input type="number" value={meta} onChange={(e) => setMeta(e.target.value)} />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="font-serif text-3xl">Seu trial Pro está pronto</h2>
              <p className="text-sm text-muted-foreground">7 dias grátis com tudo liberado. Sem cartão.</p>
              <div className="rounded-2xl border bg-gradient-to-br from-gold/15 to-transparent p-5">
                <p className="text-xs font-semibold text-gold">PLANO PRO</p>
                <p className="mt-2 font-serif text-4xl">R$ 97<span className="text-base text-muted-foreground">/mês após o trial</span></p>
                <ul className="mt-4 space-y-2 text-sm">
                  {["Assistente 360 IA ilimitado","Relatórios avançados","Integrações","Suporte prioritário"].map((p) => (
                    <li key={p} className="flex items-center gap-2"><Check className="size-4 text-primary" />{p}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Voltar</Button>
            {step < steps.length - 1 ? (
              <Button className="bg-gradient-primary" onClick={() => setStep(step + 1)}>Continuar</Button>
            ) : (
              <Button className="bg-gradient-primary" onClick={finish}>Entrar no app</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
