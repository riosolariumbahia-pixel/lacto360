# Fase 4 — Relatórios Consolidados & Assistente IA

Transforma `app.relatorios.tsx` (hoje só mock) em dashboard executivo real, e `app.assistente.tsx` em chat IA conectado aos dados da org via Lovable AI Gateway.

## Escopo

**Dentro:**
- Dashboard consolidado com dados reais de Produção, Comercial e Financeiro
- Filtro de período (7d / 30d / 90d / 12m) global na página
- KPIs estratégicos: faturamento, lucro bruto, margem, rendimento médio, ticket médio, clientes ativos
- Gráficos: evolução receita x despesa x lucro, rendimento de produção, mix de canais real, top clientes, top produtos
- Exportação CSV dos dados do período
- Assistente IA conversacional com contexto dos dados da org (resumo automático injetado no system prompt)
- Botão "Gerar insights agora" — análise proativa que retorna 3-5 cards (alertas de margem, oportunidades, riscos)

**Fora (futuras):**
- Previsão de caixa por ML
- Exportação PDF formatada
- Agendamento de relatórios por email
- Comparativo entre filiais

## Backend

### Server function — Lovable AI
`src/lib/ai.functions.ts` (createServerFn, protegida por `requireSupabaseAuth`):

- `chatWithAssistant({ messages })` — chama `https://ai.gateway.lovable.dev/v1/chat/completions` com `LOVABLE_API_KEY` (já existe em secrets), modelo `google/gemini-2.5-flash`. Antes de chamar, busca um snapshot do contexto da org (KPIs últimos 30d, top 5 clientes, top 5 produtos, contas vencidas) e injeta como system message. Retorna `{ content }`.
- `generateInsights()` — mesmo contexto, mas com `response_format: json_object` e schema fixo: `{ insights: [{ title, text, tone: 'success'|'warning'|'info', icon }] }`. Retorna 3-5 itens.
- Tratamento: 429 → "Limite atingido, tente em instantes"; 402 → "Créditos esgotados".

Sem nova tabela. Histórico do chat fica só em memória da sessão (estado local do componente).

`src/start.ts` — confirmar `attachSupabaseAuth` registrado (já está).

## Camada de dados

`src/lib/reports.ts` (TanStack Query):
- `useExecutiveKPIs(period)` — agrega `sales_orders`, `finance_entries`, `production_*` no client (já temos os hooks; aqui faz cross-join)
- `useRevenueVsExpense(period)` — série mensal a partir de `finance_entries`
- `useProductionYield(period)` — média de `yield_percent` por dia/semana
- `useTopCustomers(period, limit)` / `useTopProducts(period, limit)` — agregação de `sales_order_items` join `sales_orders`
- `useChannelMix(period)` — `sales_orders` agrupado por `channel`
- `exportReportCSV(period)` — função pura, gera CSV com pedidos + lançamentos do período e dispara download

## Frontend

### `src/routes/app.relatorios.tsx` (reescrita)
- `<PageHeader>` com `<Select>` de período (7/30/90/365 dias) + botão "Exportar CSV"
- Grid de 6 KPIs (KpiCard existente)
- 4 gráficos: AreaChart (receita/despesa/lucro), LineChart (rendimento), PieChart (canais reais), BarChart horizontal (top 10 clientes)
- Card "Top produtos" — tabela compacta

### `src/routes/app.assistente.tsx` (reescrita)
- Layout chat: lista de mensagens (user/assistant) com `react-markdown` para render do assistente
- Input com `Textarea` + botão Enviar (Enter envia, Shift+Enter quebra linha)
- `useMutation` chamando `chatWithAssistant`; histórico completo enviado a cada turn
- Sidebar direita: botão "Gerar insights" → chama `generateInsights`, renderiza `<AiInsightCard>` (já existe) com os resultados
- Estado de loading (spinner inline na bolha) e tratamento de erro com toast
- Mensagem inicial do assistente: "Olá! Sou seu copiloto de gestão. Pergunte sobre vendas, estoque, margem ou peça uma análise."

### Permissões UI
- Relatórios: visível para todos os papéis (read-only)
- Assistente: idem; sem restrição

## Dependências
- `bun add react-markdown` (assistente)
- Sem novas migrações.

## Arquivos
- `src/lib/ai.functions.ts` (novo, server)
- `src/lib/reports.ts` (novo)
- `src/routes/app.relatorios.tsx` (reescrita real)
- `src/routes/app.assistente.tsx` (reescrita real)

## Roadmap restante
- **Fase 5** — Onboarding guiado + convites de equipe (`invitations` já existe)
- **Fase 6** — Polimento, billing/trial, landing page

Aprovar para executar.
