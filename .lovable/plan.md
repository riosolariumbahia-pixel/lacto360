# SeuLaticinio360 — Plataforma SaaS Premium para Laticínios

Migrar o conteúdo do ZIP para o template TanStack Start atual e elevar visual ao nível Stripe/Notion/Linear, com foco em manteiga e gestão de laticínio.

## Identidade visual

Tokens em `src/styles.css` (oklch), expostos via `@theme inline`:

- `--background` #F8FAFC (ice) / dark #0F172A (azul petróleo)
- `--foreground` #0F172A / #F8FAFC
- `--primary` #22C55E (verde agro)
- `--accent-gold` #D4A017 (dourado manteiga, sutil — apenas em badges, KPI hero, CTA Pro)
- `--surface` #1E293B em dark, #FFFFFF em light
- `--muted-foreground` cinza moderno
- Tipografia: **Inter** (UI) + **Instrument Serif** (números grandes/hero) via Google Fonts
- Bordas suaves (`--radius: 0.875rem`), sombras coloridas suaves (`--shadow-glow: 0 20px 60px -20px color-mix(in oklab, var(--primary) 25%, transparent)`)
- Gradientes: `--gradient-hero` (petróleo→verde), `--gradient-gold` (dourado manteiga)
- Modo padrão: **dark premium** com toggle para light

Animações utilitárias: fade-in-up, scale-in, count-up nos KPIs, shimmer nos skeletons, hover-lift nos cards.

## Arquitetura de rotas (TanStack Start)

Substituir o placeholder atual e criar:

```
src/routes/
  __root.tsx              providers (QueryClient, Theme, Toaster)
  index.tsx               landing page premium
  login.tsx               auth mock (localStorage)
  cadastro.tsx            signup + trial 7 dias
  onboarding.tsx          wizard 4 passos (laticínio, produtos, meta, plano)
  _app.tsx                layout autenticado com AppSidebar (renderiza <Outlet/>)
  _app/dashboard.tsx      dashboard principal
  _app/producao.tsx       lotes de manteiga, rendimento, margem
  _app/estoque.tsx        leite, creme, sal, manteiga, perdas
  _app/vendas.tsx         pedidos e clientes
  _app/financeiro.tsx     faturamento, lucro, despesas
  _app/clientes.tsx       CRM simples
  _app/relatorios.tsx     gráficos avançados
  _app/assistente.tsx     "Assistente 360 IA" (mock chat)
  _app/configuracoes.tsx  perfil, plano, trial status
```

Auth/trial mock em `src/lib/session.ts` com Zustand-like store em localStorage (`user`, `trialStartedAt`, `plan: 'trial' | 'pro'`). Guarda no `_app` via `beforeLoad` redirecionando para `/login`.

## Componentes-chave

`src/components/`:
- `app-sidebar.tsx` — shadcn Sidebar collapsible="icon", grupos: Visão Geral / Operação / Financeiro / Inteligência. Badge "Pro" e contador de dias do trial no rodapé.
- `topbar.tsx` — busca global (⌘K), notificações inteligentes, avatar, theme toggle.
- `kpi-card.tsx` — card premium com number count-up, sparkline mini (recharts), delta colorido, ícone em quadrado com tint.
- `metric-hero.tsx` — bloco hero com tipografia serif para "R$ faturado este mês".
- `chart-card.tsx` — wrapper padronizado para AreaChart/BarChart/PieChart com gradient defs e tooltip custom.
- `ai-insight-card.tsx` — cards do Assistente 360 IA com gradiente sutil e shimmer.
- `notification-popover.tsx` — feed de notificações inteligentes (estoque baixo, cliente inativo, meta).
- `command-menu.tsx` — ⌘K com cmdk para navegar.
- `onboarding-wizard.tsx` — 4 passos com progress, animação de transição.
- `landing/` — Hero, LogosBar, FeatureGrid, ProductTour (mockup do dashboard), Pricing (Trial 7 dias / Pro mensal / Anual), FAQ, CTA, Footer.

## Métricas e mock data

`src/lib/mock-data.ts` centraliza dados específicos de laticínio/manteiga:
- Produção semanal de manteiga (kg, lucro, rendimento %)
- Estoque: leite (L), creme (kg), sal (kg), manteiga pronta (kg), embalagens
- Perdas por lote (kg + R$)
- Lucro vs despesa mensal (12 meses)
- Pedidos por canal (supermercados, padarias, distribuidores, varejo)
- Top clientes com ticket médio e status
- Faturamento, ticket médio, LTV, inadimplência
- Insights da IA pré-roteirizados em PT-BR

## Dashboard emocional

- Hero com saudação ("Bom dia, João — sua produção rendeu R$ 12.480 esta semana")
- 4 KPI cards animados (Faturamento, Manteiga produzida, Lucro líquido, Rendimento médio)
- Linha de produção (AreaChart com gradient verde→transparente)
- Lucro vs Despesa (BarChart empilhado)
- Pizza de canais de venda (donut com legend custom)
- Bloco "Assistente 360 IA" com 3 insights acionáveis
- Tabela top clientes com mini-progress de meta

## Assistente 360 IA

Página `/assistente` com chat mock estilizado (bolhas, typing indicator, sugestões rápidas), respostas pré-roteirizadas baseadas em palavras-chave do mock data ("quanto produzi essa semana", "qual cliente está sumido", etc.). Visual gradiente premium com avatar IA.

## Onboarding e trial

- `/cadastro` cria usuário mock + grava `trialStartedAt = now`
- Redireciona para `/onboarding` (4 passos: dados do laticínio, produtos vendidos, meta mensal, escolha de plano com 7 dias grátis em destaque)
- Sidebar mostra "Trial: 6 dias restantes" com barra; ao expirar, modal de upgrade
- Página `/configuracoes` com card de plano e botão "Upgrade Pro" (mock — sem pagamento agora)

## Landing page

Stack vertical inspirada em Stripe/Linear:
1. Nav fixa com blur
2. Hero: headline serif + subhead + CTAs ("Começar grátis 7 dias" / "Ver demo") + mockup do dashboard com glow
3. Faixa de logos (clientes fictícios de laticínios)
4. Bento grid de features (6 cards: Produção, Estoque, IA, Financeiro, Clientes, Mobile)
5. "Product tour" com 3 screenshots animados
6. Pricing: Trial / Pro R$97 / Anual R$77/mês
7. Depoimentos
8. FAQ accordion
9. CTA final com gradient
10. Footer

## Performance, mobile, Vercel

- Code splitting automático via TanStack file-routes
- Imagens otimizadas em `src/assets`, lazy via dynamic import nos blocos pesados
- Mobile-first: sidebar vira sheet, KPI grid 1→2→4 cols, tabelas viram cards em <md
- `vercel.json` não é necessário (já roda no edge configurado), mas validamos build limpo
- Sem dependências Node-only

## Stack a adicionar

`bun add` para: `recharts`, `cmdk`, `zustand`, `framer-motion`, `class-variance-authority` (já), `date-fns`. Fontes via `<link>` no `__root` head.

## Etapas de implementação

1. Tokens, fontes, base layout dark premium em `styles.css`
2. Auth/trial mock + store + guarda do grupo `_app`
3. AppSidebar + Topbar + CommandMenu + NotificationPopover
4. Mock data central + componentes KPI/Chart/Insight reutilizáveis
5. Dashboard, Produção, Estoque, Vendas, Financeiro, Clientes, Relatórios
6. Assistente 360 IA (chat mock)
7. Configurações + paywall trial
8. Onboarding wizard
9. Landing page + Login + Cadastro
10. Polimento mobile, animações, QA visual

## O que NÃO entra agora

- Lovable Cloud / banco real / auth real
- Pagamentos Stripe/Paddle (botões visuais apenas)
- IA real (respostas roteirizadas)

Tudo acima pode ser plugado depois sem refazer a UI.
