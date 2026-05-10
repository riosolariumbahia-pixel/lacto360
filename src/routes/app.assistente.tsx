import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/app/page-header";
import { aiInsights, fmtBRL, kpis } from "@/lib/mock-data";
import { AiInsightCard } from "@/components/app/ai-insight-card";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/app/assistente")({ component: AssistentePage });

type Msg = { id: number; role: "user" | "ai"; text: string };

const suggestions = [
  "Quanto produzi essa semana?",
  "Qual cliente está sumido?",
  "Como está minha margem?",
  "Estou perto da meta?",
];

function answer(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("produzi") || t.includes("produção")) return `Você produziu ${kpis.manteigaKg} kg de manteiga este mês — alta de ${kpis.manteigaDelta}% vs mês anterior.`;
  if (t.includes("cliente") && (t.includes("sum") || t.includes("inativ"))) return "A Mercearia do João está há 12 dias sem comprar. Sugiro um contato hoje — ticket médio de R$ 1.200.";
  if (t.includes("margem")) return `Sua margem média está em 73,2%. O lote L-2026-088 teve a melhor margem (78,8%).`;
  if (t.includes("meta")) return `Você está em 87% da meta de faturamento de Maio (${fmtBRL(kpis.faturamentoMes)} / ${fmtBRL(54000)}).`;
  if (t.includes("estoque") || t.includes("emba")) return "Embalagens 200g abaixo do mínimo (120 un, mín. 500). Reposição recomendada nas próximas 36h.";
  return "Posso te ajudar com produção, estoque, vendas, clientes e financeiro. Tente: 'Quanto produzi essa semana?'";
}

function AssistentePage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 1, role: "ai", text: "Olá! Sou o Assistente 360 IA do seu laticínio. Posso analisar produção, estoque, vendas e financeiro. O que você quer saber?" },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);

  function send(text: string) {
    if (!text.trim()) return;
    const userMsg: Msg = { id: Date.now(), role: "user", text };
    setMsgs((m) => [...m, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      setMsgs((m) => [...m, { id: Date.now() + 1, role: "ai", text: answer(text) }]);
      setTyping(false);
    }, 700);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Assistente 360 IA" subtitle="Sua copilota de gestão para o laticínio" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 flex flex-col rounded-2xl border bg-card">
          <div className="flex items-center gap-3 border-b p-4">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-primary shadow-glow">
              <Brain className="size-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold flex items-center gap-1">360 IA <Sparkles className="size-3 text-gold" /></p>
              <p className="text-xs text-muted-foreground">Online • respostas em segundos</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 min-h-[420px] max-h-[520px]">
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm",
                  m.role === "user" ? "bg-gradient-primary text-primary-foreground" : "bg-muted")}>
                  {m.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-4 py-3">
                  <span className="inline-flex gap-1">
                    <span className="size-1.5 animate-bounce rounded-full bg-foreground/50" style={{ animationDelay: "0ms" }} />
                    <span className="size-1.5 animate-bounce rounded-full bg-foreground/50" style={{ animationDelay: "150ms" }} />
                    <span className="size-1.5 animate-bounce rounded-full bg-foreground/50" style={{ animationDelay: "300ms" }} />
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="border-t p-3">
            <div className="mb-2 flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button key={s} onClick={() => send(s)} className="rounded-full border bg-muted/40 px-3 py-1 text-xs hover:bg-muted">
                  {s}
                </button>
              ))}
            </div>
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
              <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte qualquer coisa…" />
              <Button type="submit" className="bg-gradient-primary"><Send className="size-4" /></Button>
            </form>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Insights de hoje</p>
          {aiInsights.map((i) => (
            <AiInsightCard key={i.id} title={i.title} text={i.text} tone={i.tone} icon={i.icon as any} />
          ))}
        </div>
      </div>
    </div>
  );
}
