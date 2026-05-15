import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Brain, Send, Sparkles, Wand2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/app/page-header";
import { AiInsightCard } from "@/components/app/ai-insight-card";
import { cn } from "@/lib/utils";
import { chatWithAssistant, generateInsights } from "@/lib/ai.functions";

export const Route = createFileRoute("/app/assistente")({ component: AssistentePage });

type Msg = { id: number; role: "user" | "assistant"; content: string };
type Insight = { id: number; title: string; text: string; tone: "success" | "warning" | "info"; icon: "trend" | "alert" | "users" | "target" };

const suggestions = [
  "Quanto faturei nos últimos 30 dias?",
  "Qual canal vende mais?",
  "Como está minha margem?",
  "Há contas vencidas?",
];

function AssistentePage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { id: 1, role: "assistant", content: "Olá! Sou seu copiloto de gestão. Pergunte sobre vendas, estoque, margem ou peça uma análise." },
  ]);
  const [input, setInput] = useState("");
  const [insights, setInsights] = useState<Insight[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatFn = useServerFn(chatWithAssistant);
  const insightsFn = useServerFn(generateInsights);

  const chat = useMutation({
    mutationFn: (history: Msg[]) =>
      chatFn({ data: { messages: history.map((m) => ({ role: m.role, content: m.content })) } }),
    onSuccess: (res) => {
      setMsgs((m) => [...m, { id: Date.now(), role: "assistant", content: res.content || "(sem resposta)" }]);
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao consultar IA"),
  });

  const insightsM = useMutation({
    mutationFn: () => insightsFn({}),
    onSuccess: (res) => setInsights(res.insights as Insight[]),
    onError: (e: any) => toast.error(e?.message ?? "Falha ao gerar insights"),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, chat.isPending]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || chat.isPending) return;
    const next: Msg[] = [...msgs, { id: Date.now(), role: "user", content: trimmed }];
    setMsgs(next);
    setInput("");
    chat.mutate(next.filter((m) => m.role !== "assistant" || m.id !== 1).slice(-20));
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
              <p className="text-xs text-muted-foreground">Conectado aos seus dados em tempo real</p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 min-h-[420px] max-h-[520px]">
            {msgs.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm",
                  m.role === "user" ? "bg-gradient-primary text-primary-foreground" : "bg-muted",
                )}>
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1">
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {chat.isPending && (
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
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={chat.isPending}
                  className="rounded-full border bg-muted/40 px-3 py-1 text-xs hover:bg-muted disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => { e.preventDefault(); send(input); }}
              className="flex gap-2 items-end"
            >
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Pergunte qualquer coisa…"
                rows={1}
                className="min-h-[40px] max-h-32 resize-none"
              />
              <Button type="submit" disabled={chat.isPending} className="bg-gradient-primary">
                <Send className="size-4" />
              </Button>
            </form>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Insights</p>
            <Button size="sm" variant="outline" onClick={() => insightsM.mutate()} disabled={insightsM.isPending}>
              <Wand2 className="size-3 mr-1" />
              {insightsM.isPending ? "Gerando…" : "Gerar"}
            </Button>
          </div>
          {insights.length === 0 && !insightsM.isPending && (
            <div className="rounded-xl border border-dashed bg-muted/30 p-4 text-sm text-muted-foreground">
              Clique em "Gerar" para receber alertas e oportunidades baseados nos seus dados.
            </div>
          )}
          {insightsM.isPending && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border bg-muted/30" />
          ))}
          {insights.map((i) => (
            <AiInsightCard key={i.id} title={i.title} text={i.text} tone={i.tone} icon={i.icon} />
          ))}
        </div>
      </div>
    </div>
  );
}
