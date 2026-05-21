import { Link } from "@tanstack/react-router";
import { Crown, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { trialDaysLeft, useSession } from "@/lib/session";

export function TrialBanner() {
  const session = useSession();
  const [dismissed, setDismissed] = useState(false);

  if (session.plan !== "trial") return null;
  const days = trialDaysLeft(session);
  if (dismissed && days > 2) return null;

  const expired = days <= 0;
  const urgent = days <= 2;

  return (
    <div
      className={`flex items-center justify-between gap-3 border-b px-4 py-2 text-sm ${
        expired
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : urgent
          ? "border-warning/40 bg-warning/10 text-foreground"
          : "border-primary/30 bg-primary/5 text-foreground"
      }`}
    >
      <div className="flex items-center gap-2">
        <Crown className="size-4 shrink-0" />
        <span className="truncate">
          {expired
            ? "Seu período de avaliação terminou."
            : `${days} dia${days === 1 ? "" : "s"} restantes no trial Pro.`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button asChild size="sm" className="h-7 bg-gradient-primary text-xs">
          <Link to="/app/assinatura">{expired ? "Fazer upgrade" : "Ver planos"}</Link>
        </Button>
        {!urgent && !expired && (
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}