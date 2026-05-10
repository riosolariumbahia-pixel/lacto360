import { AlertTriangle, Sparkles, Target, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const iconMap = { trend: TrendingUp, alert: AlertTriangle, users: Users, target: Target } as const;

export function AiInsightCard({
  title,
  text,
  tone,
  icon = "trend",
}: {
  title: string;
  text: string;
  tone: "success" | "warning" | "info";
  icon?: keyof typeof iconMap;
}) {
  const Icon = iconMap[icon];
  const toneCls =
    tone === "success" ? "bg-success/10 text-success ring-success/20"
    : tone === "warning" ? "bg-warning/10 text-warning ring-warning/20"
    : "bg-info/10 text-info ring-info/20";
  return (
    <div className="group relative overflow-hidden rounded-xl border bg-card p-4 hover-lift">
      <div className="flex items-start gap-3">
        <div className={cn("grid size-9 shrink-0 place-items-center rounded-lg ring-1", toneCls)}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{title}</p>
            <Sparkles className="size-3 text-gold" />
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
    </div>
  );
}
