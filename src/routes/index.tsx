import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight, BarChart3, Boxes, Brain, Check, Factory, Sparkles,
  ShoppingCart, Smartphone, Star, Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { weeklyProduction } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SeuLaticínio 360 — Gestão premium para laticínios e produção de manteiga" },
      { name: "description", content: "A plataforma SaaS completa para laticínios. Controle produção, estoque, vendas, financeiro e use IA para tomar melhores decisões. 7 dias grátis." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: Factory, title: "Produção & lotes", text: "Registre cada batelada, calcule rendimento e margem em tempo real." },
  { icon: Boxes, title: "Estoque inteligente", text: "Leite, creme, sal e embalagens monitorados — alertas antes de faltar." },
  { icon: ShoppingCart, title: "Vendas & pedidos", text: "Pedidos, canais e ticket médio organizados como em uma fintech." },
  { icon: Wallet, title: "Financeiro claro", text: "Faturamento, despesas e lucro com gráficos limpos e exportáveis." },
  { icon: Brain, title: "Assistente 360 IA", text: "Pergunte em linguagem natural e receba insights acionáveis." },
  { icon: Smartphone, title: "Mobile premium", text: "Use no celular no chão de fábrica com a mesma fluidez do desktop." },
];

const faqs = [
  { q: "Preciso de cartão de crédito para começar?", a: "Não. Você tem 7 dias grátis no plano Pro sem cartão." },
  { q: "Funciona no celular?", a: "Sim, é totalmente responsivo e otimizado para uso no chão de fábrica." },
  { q: "Posso cancelar quando quiser?", a: "Claro. Sem fidelidade — cancele com um clique." },
  { q: "A IA entende meu laticínio?", a: "Sim. Ela lê seus dados de produção, estoque e vendas para te dar respostas específicas." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/70 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-gradient-primary shadow-glow">
              <Sparkles className="size-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold">SeuLaticínio <span className="text-muted-foreground">360</span></span>
          </Link>
          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Recursos</a>
            <a href="#preview" className="hover:text-foreground">Demo</a>
            <a href="#pricing" className="hover:text-foreground">Preços</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm"><Link to="/login">Entrar</Link></Button>
            <Button asChild size="sm" className="bg-gradient-primary"><Link to="/cadastro">Começar grátis</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg radial-fade opacity-40" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28 text-center">
          <Badge className="bg-primary/10 text-primary hover:bg-primary/15"><Sparkles className="mr-1 size-3" /> Novo: Assistente 360 IA</Badge>
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] md:text-7xl">
            Gerencie seu laticínio<br />como uma <span className="text-gradient-primary">fintech</span>.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
            Produção de manteiga, estoque, vendas, financeiro e IA — tudo em uma plataforma premium feita para empresários rurais.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Button asChild size="lg" className="bg-gradient-primary shadow-glow">
              <Link to="/cadastro">Começar 7 dias grátis <ArrowRight className="ml-1 size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline"><a href="#preview">Ver demo</a></Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Sem cartão • Cancele quando quiser</p>

          {/* Mockup */}
          <div id="preview" className="relative mx-auto mt-14 max-w-5xl">
            <div className="absolute inset-0 -z-10 bg-gradient-primary opacity-30 blur-3xl" />
            <div className="overflow-hidden rounded-3xl border bg-card shadow-elegant">
              <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
                <span className="size-2.5 rounded-full bg-destructive/70" />
                <span className="size-2.5 rounded-full bg-warning/70" />
                <span className="size-2.5 rounded-full bg-primary/70" />
                <span className="ml-3 text-xs text-muted-foreground">app.seulaticinio360.com</span>
              </div>
              <div className="grid gap-4 p-6 md:grid-cols-3">
                {[
                  { label: "Faturamento", value: "R$ 47.230", delta: "+12.4%" },
                  { label: "Manteiga (kg)", value: "1.531", delta: "+8.1%" },
                  { label: "Lucro líquido", value: "R$ 23.120", delta: "+18.6%" },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border bg-background p-4 text-left">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
                    <p className="mt-2 font-serif text-3xl">{s.value}</p>
                    <p className="mt-1 text-xs text-success">{s.delta}</p>
                  </div>
                ))}
                <div className="md:col-span-3 rounded-xl border bg-background p-2 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyProduction}>
                      <defs>
                        <linearGradient id="hero" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area dataKey="kg" stroke="var(--primary)" strokeWidth={2.5} fill="url(#hero)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / proof */}
      <section className="border-y bg-muted/30 py-8">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">Usado por laticínios em todo o Brasil</p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-sm font-semibold text-muted-foreground/70">
            {["Vale Verde","Serra Dourada","Boa Vista","Campo Belo","Fazenda Aurora","Latcco"].map((n) => <span key={n}>{n}</span>)}
          </div>
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary">Recursos</Badge>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">Tudo que seu laticínio precisa.<br />Em um só lugar.</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border bg-card p-6 hover-lift">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="overflow-hidden rounded-3xl border bg-gradient-hero p-8 text-white md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <Badge className="bg-white/15 text-white">Assistente 360 IA</Badge>
              <h2 className="mt-3 font-serif text-4xl md:text-5xl">Sua copilota de gestão.</h2>
              <p className="mt-3 text-white/80">Pergunte "quanto produzi essa semana" ou "qual cliente está sumido" e receba respostas instantâneas baseadas nos seus dados.</p>
              <Button asChild className="mt-5 bg-white text-foreground hover:bg-white/90">
                <Link to="/cadastro">Experimentar grátis</Link>
              </Button>
            </div>
            <div className="rounded-2xl bg-white/10 p-4 backdrop-blur space-y-3">
              {["Quanto produzi essa semana?","Qual cliente está sumido?","Como está minha margem?"].map((q, i) => (
                <div key={q}>
                  <div className="rounded-xl bg-white/15 px-3 py-2 text-sm w-fit ml-auto">{q}</div>
                  <div className="mt-1 max-w-[80%] rounded-xl bg-white/90 px-3 py-2 text-sm text-foreground">
                    {i === 0 && "Você produziu 1.531 kg de manteiga este mês — alta de 8,1%."}
                    {i === 1 && "Mercearia do João: 12 dias sem comprar. Ticket médio R$ 1.200."}
                    {i === 2 && "Margem média 73,2%. Lote L-2026-088 lidera com 78,8%."}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary">Preços</Badge>
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">Comece grátis. Cresça quando quiser.</h2>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
          <PricingCard name="Trial" price="Grátis" desc="7 dias com tudo do Pro." perks={["Tudo do Pro","Sem cartão","7 dias completos"]} cta="Começar agora" highlight={false} />
          <PricingCard name="Pro" price="R$ 97" suffix="/mês" desc="Para o seu laticínio." perks={["Produção, estoque, vendas, financeiro","Assistente 360 IA ilimitado","Relatórios avançados","Suporte prioritário"]} cta="Assinar Pro" highlight />
          <PricingCard name="Anual" price="R$ 77" suffix="/mês" desc="Pague 12, leve 14." perks={["Tudo do Pro","2 meses grátis","Onboarding personalizado"]} cta="Economizar 20%" highlight={false} />
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: "Carlos Mendes", role: "Laticínio Vale Verde — MG", text: "Reduzi 30% das perdas no primeiro mês. A IA realmente entende o negócio." },
            { name: "Ana Souza", role: "Serra Dourada — SP", text: "Finalmente um sistema que cabe no celular sem virar bagunça." },
            { name: "Rogério Lima", role: "Boa Vista Lácteos — GO", text: "Parece que tem um gerente extra trabalhando comigo todo dia." },
          ].map((t) => (
            <div key={t.name} className="rounded-2xl border bg-card p-6">
              <div className="flex gap-1 text-gold">{Array.from({length:5}).map((_,i) => <Star key={i} className="size-4 fill-current" />)}</div>
              <p className="mt-3 text-sm">"{t.text}"</p>
              <p className="mt-4 text-xs font-semibold">{t.name}</p>
              <p className="text-xs text-muted-foreground">{t.role}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 pb-20">
        <h2 className="text-center font-serif text-4xl">Perguntas frequentes</h2>
        <Accordion type="single" collapsible className="mt-8">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`f-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20">
        <div className="overflow-hidden rounded-3xl border bg-gradient-hero p-10 text-center text-white md:p-16">
          <BarChart3 className="mx-auto size-8 opacity-80" />
          <h2 className="mt-3 font-serif text-4xl md:text-5xl">Pronto para profissionalizar seu laticínio?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">Crie sua conta em 1 minuto e comece os 7 dias grátis no Pro.</p>
          <Button asChild size="lg" className="mt-6 bg-white text-foreground hover:bg-white/90">
            <Link to="/cadastro">Começar agora <ArrowRight className="ml-1 size-4" /></Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-xs text-muted-foreground md:flex-row">
          <p>© 2026 SeuLaticínio 360. Feito para quem produz manteiga de verdade.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-foreground">Termos</a>
            <a href="#" className="hover:text-foreground">Privacidade</a>
            <a href="#" className="hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PricingCard({ name, price, suffix, desc, perks, cta, highlight }: { name: string; price: string; suffix?: string; desc: string; perks: string[]; cta: string; highlight: boolean }) {
  return (
    <div className={`relative rounded-2xl border bg-card p-6 ${highlight ? "ring-2 ring-primary shadow-glow" : ""}`}>
      {highlight && <Badge className="absolute -top-3 left-6 bg-gradient-primary">Mais popular</Badge>}
      <p className="text-sm font-semibold">{name}</p>
      <p className="mt-2 font-serif text-4xl">{price}{suffix && <span className="text-base text-muted-foreground">{suffix}</span>}</p>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
      <ul className="mt-5 space-y-2 text-sm">
        {perks.map((p) => <li key={p} className="flex items-center gap-2"><Check className="size-4 text-primary" />{p}</li>)}
      </ul>
      <Button asChild className={`mt-6 w-full ${highlight ? "bg-gradient-primary" : ""}`} variant={highlight ? "default" : "outline"}>
        <Link to="/cadastro">{cta}</Link>
      </Button>
    </div>
  );
}
