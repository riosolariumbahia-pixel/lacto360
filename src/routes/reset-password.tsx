import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sessionApi } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({ component: ResetPasswordPage });

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash.includes("type=recovery")) setMode("update");
  }, []);

  async function requestReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const err = await sessionApi.resetPassword(email);
    setLoading(false);
    if (err) toast.error(err.message);
    else toast.success("Enviamos um link para seu e-mail.");
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada.");
    navigate({ to: "/app" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={mode === "request" ? requestReset : updatePassword} className="w-full max-w-sm space-y-5">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid size-9 place-items-center rounded-lg bg-gradient-primary"><Sparkles className="size-4 text-primary-foreground" /></div>
          <span className="font-semibold">SeuLaticínio 360</span>
        </Link>
        <div>
          <h1 className="font-serif text-3xl">{mode === "request" ? "Recuperar senha" : "Nova senha"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "request" ? "Enviamos um link para seu e-mail." : "Defina uma nova senha para acessar."}
          </p>
        </div>
        {mode === "request" ? (
          <div><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        ) : (
          <div><Label>Nova senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
        )}
        <Button type="submit" disabled={loading} className="w-full bg-gradient-primary">
          {loading ? "Aguarde..." : mode === "request" ? "Enviar link" : "Salvar nova senha"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary">Voltar para login</Link>
        </p>
      </form>
    </div>
  );
}
