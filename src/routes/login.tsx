import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { sessionApi } from "@/lib/session";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const [email, setEmail] = useState("demo@laticinio.com");
  const [pw, setPw] = useState("demo1234");
  const navigate = useNavigate();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    sessionApi.signIn(email);
    sessionApi.setOnboarded(true);
    navigate({ to: "/app" });
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-hero p-10 md:block">
        <div className="absolute inset-0 grid-bg radial-fade opacity-30" />
        <div className="relative flex h-full flex-col justify-between text-white">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-lg bg-white/10 backdrop-blur"><Sparkles className="size-4" /></div>
            <span className="font-semibold">SeuLaticínio 360</span>
          </Link>
          <div>
            <h2 className="font-serif text-4xl leading-tight">A gestão que faltava no seu laticínio.</h2>
            <p className="mt-3 max-w-sm text-white/75">Produção, estoque, vendas e IA em um só lugar — feito para empresários rurais que pensam grande.</p>
          </div>
          <p className="text-xs text-white/60">© 2026 SeuLaticínio 360</p>
        </div>
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5">
          <div>
            <h1 className="font-serif text-3xl">Entrar</h1>
            <p className="mt-1 text-sm text-muted-foreground">Bem-vindo de volta.</p>
          </div>
          <div className="space-y-3">
            <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
            <div><Label>Senha</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required /></div>
          </div>
          <Button type="submit" className="w-full bg-gradient-primary">Entrar</Button>
          <p className="text-center text-sm text-muted-foreground">
            Não tem conta? <Link to="/cadastro" className="font-semibold text-primary">Comece grátis</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
