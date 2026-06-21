import { useState } from "react";
import { ShieldCheck, ShieldOff, KeyRound, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { securityApi } from "@/lib/security";
import { toast } from "sonner";

export function SecurityCard() {
  const factors = securityApi.useFactors();
  const enroll = securityApi.useEnrollTotp();
  const verify = securityApi.useVerifyTotp();
  const unenroll = securityApi.useUnenrollFactor();
  const signOutAll = securityApi.useSignOutAll();

  const [enrollment, setEnrollment] = useState<null | {
    factorId: string;
    qrCode: string;
    secret: string;
  }>(null);
  const [code, setCode] = useState("");

  const verifiedTotp = (factors.data ?? []).filter(
    (f) => f.factor_type === "totp" && f.status === "verified",
  );
  const hasMfa = verifiedTotp.length > 0;

  async function startEnroll() {
    try {
      const res = await enroll.mutateAsync("Autenticador Lacto360");
      setEnrollment({ factorId: res.factorId, qrCode: res.qrCode, secret: res.secret });
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function confirmEnroll() {
    if (!enrollment) return;
    try {
      await verify.mutateAsync({ factorId: enrollment.factorId, code });
      toast.success("Autenticação em dois fatores ativada.");
      setEnrollment(null);
      setCode("");
    } catch (err) {
      toast.error((err as Error).message || "Código inválido.");
    }
  }

  async function cancelEnroll() {
    if (enrollment) {
      try { await unenroll.mutateAsync(enrollment.factorId); } catch { /* ignore */ }
    }
    setEnrollment(null);
    setCode("");
  }

  async function disableMfa(factorId: string) {
    try {
      await unenroll.mutateAsync(factorId);
      toast.success("Fator removido.");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function signOutEverywhere() {
    try {
      await signOutAll.mutateAsync();
      toast.success("Todas as sessões foram encerradas.");
      window.location.href = "/login";
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Segurança da conta</h3>
        {hasMfa && <Badge className="ml-2" variant="secondary">MFA ativo</Badge>}
      </div>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <p className="font-medium">Autenticação em dois fatores (TOTP)</p>
          <p className="text-muted-foreground">
            Use um app como Google Authenticator, Authy ou 1Password para gerar códigos.
          </p>
        </div>

        {factors.isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando…</p>
        ) : hasMfa ? (
          <div className="space-y-2">
            {verifiedTotp.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{f.friendly_name || "Autenticador"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Ativado em {new Date(f.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => disableMfa(f.id)}>
                  <ShieldOff className="size-3.5 text-destructive" /> Desativar
                </Button>
              </div>
            ))}
          </div>
        ) : enrollment ? (
          <div className="space-y-3 rounded-lg border p-4">
            <p className="text-sm">
              Escaneie o QR code com seu app autenticador e informe o código de 6 dígitos.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <img
                src={enrollment.qrCode}
                alt="QR Code MFA"
                className="size-40 rounded-md border bg-white p-2"
              />
              <div className="flex-1">
                <Label className="text-xs">Chave manual</Label>
                <code className="mt-1 block break-all rounded bg-muted p-2 text-[11px]">
                  {enrollment.secret}
                </code>
              </div>
            </div>
            <div>
              <Label>Código de 6 dígitos</Label>
              <Input
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={confirmEnroll} disabled={verify.isPending || code.length < 6} className="bg-gradient-primary">
                {verify.isPending ? "Verificando…" : "Ativar 2FA"}
              </Button>
              <Button variant="ghost" onClick={cancelEnroll}>Cancelar</Button>
            </div>
          </div>
        ) : (
          <Button onClick={startEnroll} disabled={enroll.isPending} variant="outline">
            <KeyRound className="size-4" /> Ativar autenticação em dois fatores
          </Button>
        )}

        <div className="border-t pt-4">
          <p className="font-medium">Sessões ativas</p>
          <p className="text-muted-foreground">
            Encerre o acesso em todos os dispositivos onde você está conectado.
          </p>
          <Button onClick={signOutEverywhere} variant="outline" className="mt-3">
            <LogOut className="size-4" /> Sair de todos os dispositivos
          </Button>
        </div>
      </div>
    </div>
  );
}