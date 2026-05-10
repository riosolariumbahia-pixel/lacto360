import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number;
  format?: (n: number) => string;
  delta?: number;
  icon: LucideIcon;
  tone?: "primary" | "gold" | "info" | "warning";
  spark?: { v: number }[];
  suffix?: string;
};

const toneRing: Record<NonNullable<Props["tone"]>, string> = {
  primary: "bg-primary/15 text-primary",
  gold: "bg-gold/15 text-gold",
  info: "bg-info/15 text-info",
  warning: "bg-warning/15 text-warning",
};

const toneStroke: Record<NonNullable<Props["tone"]>, string> = {
  primary: "var(--primary)",
  gold: "var(--gold)",
  info: "var(--info)",
  warning: "var(--warning)",
};

export function KpiCard({ label, value, format, delta, icon: Icon, tone = "primary", spark, suffix }: Props) {
  const v = useCountUp(value);
  const stroke = toneStroke[tone];
  return (
    <div className="group relative overflow-hidden rounded-2xl border bg-card p-5 hover-lift animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="font-serif text-4xl tracking-tight">
              {format ? format(v) : Math.round(v).toLocaleString("pt-BR")}
            </span>
            {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
          </div>
          {typeof delta === "number" && (
            <div className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              delta >= 0 ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>
              {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
              {Math.abs(delta).toFixed(1)}% vs mês anterior
            </div>
          )}
        </div>
        <div className={cn("grid size-10 place-items-center rounded-xl", toneRing[tone])}>
          <Icon className="size-5" />
        </div>
      </div>
      {spark && (
        <div className="-mb-2 mt-4 h-12">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`g-${label}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={stroke} stopOpacity={0.5} />
                  <stop offset="100%" stopColor={stroke} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={stroke} strokeWidth={2} fill={`url(#g-${label})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
