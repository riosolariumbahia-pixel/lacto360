import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Check } from "lucide-react";
import { sessionApi } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/cadastro")({
  validateSearch: (s: Record<string, unknown>) => ({
    invite: typeof s.invite === "string" ? s.invite : undefined,
  }),
  component: CadastroPage,
});

const perks = ["7 dias grátis no Pro", "Sem cartão de crédito", "Cancele quando quiser"];

function CadastroPage() {
  const { invite } = Route.useSearch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [laticinio, setLaticinio] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("A senha precisa ter ao menos 6 caracteres.");
      return;
    }
    setLoading(true);
    const error = await sessionApi.signUp({
      fullName: name,
      email,
      password,
      companyName: laticinio || `${name} Laticínios`,
      inviteToken: invite,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Conta criada! Verifique seu e-mail para confirmar.");
    navigate({ to: "/onboarding" });
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="flex items-center justify-center p-6 order-2 md:order-1">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="font-serif text-3xl">Comece grátis</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {invite ? "Você foi convidado para uma equipe." : "7 dias de Pro — sem cartão."}
            </p>
          </div>
          <div className="space-y-3">
            <div><Label>Seu nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="João Silva" required /></div>
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@laticinio.com" required /></div>
            <div><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
            {!invite && (
              <div><Label>Nome do laticínio</Label><Input value={laticinio} onChange={(e) => setLaticinio(e.target.value)} placeholder="Laticínio Vale Verde" required /></div>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gradient-primary">
            {loading ? "Criando..." : "Criar conta grátis"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta? <Link to="/login" className="font-semibold text-primary">Entrar</Link>
          </p>
        </form>
      </div>
      <div className="relative hidden overflow-hidden bg-gradient-hero p-10 md:block order-1 md:order-2">
        <div className="absolute inset-0 grid-bg radial-fade opacity-30" />
        <div className="relative flex h-full flex-col justify-between text-white">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-lg bg-white/10 backdrop-blur"><Sparkles className="size-4" /></div>
            <span className="font-semibold">SeuLaticínio 360</span>
          </Link>
          <div>
            <h2 className="font-serif text-4xl leading-tight">Tenha um copiloto inteligente para seu laticínio.</h2>
            <ul className="mt-6 space-y-2 text-white/85">
              {perks.map((p) => <li key={p} className="flex items-center gap-2"><Check className="size-4" />{p}</li>)}
            </ul>
          </div>
          <p className="text-xs text-white/60">© 2026 SeuLaticínio 360</p>
        </div>
      </div>
    </div>
  );
}
