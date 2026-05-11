# SeuLaticinio360 — Arquitetura SaaS Profissional Multiusuário

Plano técnico-estratégico completo. Nenhum código será escrito nesta etapa. Foco em arquitetura, banco, permissões, módulos, IA e roadmap de build em fases para economizar créditos.

## 1. Visão geral

SaaS premium para gestão de laticínios (manteiga + queijo coalho), multiusuário com 4 perfis (Administrador, Gerente Operacional, Gerente Comercial, Vendedor). Backend em **Lovable Cloud (Supabase)**. Frontend **TanStack Start + Vite** (já configurado). Hospedagem no edge (Cloudflare Workers via template atual) — Vercel também é compatível se o usuário decidir migrar. Mobile-first, visual fintech agro.

## 2. Stack técnico

- Frontend: TanStack Start, React 19, Tailwind v4, shadcn/ui, recharts, cmdk, framer-motion, date-fns
- Backend: Lovable Cloud (Postgres + Auth + Storage + Edge logic via `createServerFn`)
- IA: Lovable AI Gateway (Gemini/GPT) via server functions — sem chaves no cliente
- Estado servidor: TanStack Query
- Estado cliente leve: Zustand (sessão UI, preferências)
- Validação: Zod (em todos os server functions)
- Tipos: geração automática do Supabase + Zod schemas compartilhados

## 3. Identidade visual (já aplicada)

Tokens em `src/styles.css` (oklch): petróleo `#0F172A`, ice `#F8FAFC`, verde `#22C55E`, dourado `#D4A017`. Inter + Instrument Serif. Bordas suaves, sombras coloridas, gradientes. Mantém-se conforme já implementado.

## 4. Módulos do sistema

```text
1. Dashboard          (por perfil, dados filtrados)
2. Produção Manteiga  (lotes, rendimento, perdas, custo)
3. Produção Queijo    (lotes coalho, cura, rendimento)
4. Estoque            (matéria-prima + produto acabado + embalagens)
5. Comercial          (pedidos, vendedores, metas, clientes)
6. Financeiro         (faturamento, despesas, lucro, comissões)
7. Relatórios         (gerenciais, exportáveis PDF/CSV)
8. Assistente IA 360  (insights, alertas, chat)
9. Usuários & Perfis  (RBAC, convites, ativação)
10. Configurações     (empresa, plano, trial, integrações)
```

## 5. Modelo de dados (Supabase)

Multi-tenant por `org_id` (cada laticínio é uma organização). Toda tabela de negócio carrega `org_id` e é protegida por RLS.

### Tabelas principais

```text
organizations         id, name, plan, trial_ends_at, owner_id, created_at
profiles              id (=auth.users.id), org_id, full_name, avatar_url, phone
app_role (enum)       'admin' | 'op_manager' | 'sales_manager' | 'seller'
user_roles            id, user_id, org_id, role         (NUNCA em profiles)
invitations           id, org_id, email, role, token, expires_at, accepted_at

production_butter     id, org_id, lot_code, produced_at, milk_input_l,
                      cream_kg, butter_output_kg, yield_pct, loss_kg,
                      cost_total, notes, created_by
production_cheese     id, org_id, lot_code, produced_at, milk_input_l,
                      cheese_output_kg, cure_days, yield_pct, loss_kg,
                      cost_total, notes, created_by

inventory_items       id, org_id, sku, name, category
                      (milk|cream|salt|butter|cheese|packaging|other),
                      unit, min_stock, current_stock, updated_at
inventory_movements   id, org_id, item_id, type (in|out|loss|adjust),
                      qty, ref_table, ref_id, reason, created_by, created_at

customers             id, org_id, name, doc, channel, city, state,
                      seller_id, status, ltv_estimate
sales_orders          id, org_id, code, customer_id, seller_id,
                      issued_at, status, subtotal, discount, total,
                      payment_method, paid_at
sales_order_items     id, order_id, item_id, qty, unit_price, total

expenses              id, org_id, category (industrial|admin|logistics|tax|other),
                      description, amount, occurred_at, created_by
commissions           id, org_id, seller_id, order_id, pct, amount,
                      status (pending|paid), paid_at
goals                 id, org_id, scope (org|seller), seller_id,
                      period_month, target_revenue, target_volume_kg

ai_alerts             id, org_id, severity, type, title, body,
                      action_url, created_at, dismissed_at, target_role
notifications         id, org_id, user_id, title, body, read_at, created_at
audit_log             id, org_id, user_id, action, entity, entity_id,
                      diff_jsonb, created_at
```

### Relacionamentos-chave

- `profiles.org_id → organizations.id`
- `user_roles.user_id → auth.users.id`, `user_roles.org_id → organizations.id`
- Toda tabela de negócio: `org_id → organizations.id`
- `sales_orders.seller_id → profiles.id`, `customers.seller_id → profiles.id`
- `sales_order_items.item_id → inventory_items.id`
- Triggers de estoque: ao confirmar pedido → `inventory_movements (out)`; ao registrar produção → `inventory_movements (in)` para produto e `(out)` para insumos.

## 6. Segurança e RLS

### Princípios

- `user_roles` SEMPRE em tabela separada (nunca em `profiles`) — evita escalada de privilégio.
- Função `SECURITY DEFINER` `public.has_role(_user_id, _org_id, _role)` para evitar recursão em policies.
- Função `public.current_org_id()` (lê do JWT claim ou do `profiles`) usada em todas as policies.
- Toda tabela com RLS habilitado, default deny.
- Service role nunca exposto ao cliente; usado só em `client.server` dentro de server functions específicos.

### Matriz de permissões (resumo)

```text
                    admin  op_manager  sales_manager  seller
dashboard global      R          –             –         –
produção manteiga    RW         RW             –         –
produção queijo      RW         RW             –         –
estoque              RW         RW            R(read)    –
clientes             RW          –            RW       R/RW(próprios)
pedidos              RW          –            RW       R/RW(próprios)
vendedores/metas     RW          –            RW       R(próprias)
financeiro/lucro     RW          –             –         –
despesas industriais RW         RW(criar)      –         –
relatórios estrat.   RW          –            R(comercial) R(próprios)
ai_alerts            R(todos)   R(prod)       R(comercial) R(próprios)
usuários/perfis      RW          –             –         –
```

Policies traduzem essa matriz: cada SELECT/INSERT/UPDATE/DELETE checa `has_role` + `org_id = current_org_id()` + (quando aplicável) `seller_id = auth.uid()`.

## 7. Autenticação

- Lovable Cloud Auth: email+senha (default) e Google.
- Fluxos: signup → cria `organizations` + `profiles` + `user_roles(admin)` via trigger `handle_new_user`; trial 7 dias.
- Convites: admin gera `invitations` com role; aceitação cria `profiles` + `user_roles` na mesma `org_id`.
- Recuperação de senha: `resetPasswordForEmail` + rota pública `/reset-password`.
- Sessão: `onAuthStateChange` no provider raiz; gate de rotas via layout `_authenticated` com `beforeLoad`.
- Proteção por perfil: layouts aninhados `_authenticated/_admin`, `_authenticated/_op`, `_authenticated/_sales`, `_authenticated/_seller`.

## 8. Estrutura de rotas

```text
src/routes/
  __root.tsx
  index.tsx                       landing
  login.tsx  cadastro.tsx  reset-password.tsx
  onboarding.tsx                  wizard pós-signup
  _authenticated.tsx              gate de sessão + carrega org/role
  _authenticated/
    app.tsx                       layout (sidebar+topbar) + redireciona p/ home do role
    _admin/
      dashboard.tsx  financeiro.tsx  relatorios.tsx
      usuarios.tsx   configuracoes.tsx
    _op/
      producao-manteiga.tsx  producao-queijo.tsx
      estoque.tsx  perdas.tsx  despesas-industriais.tsx
    _sales/
      comercial.tsx  vendedores.tsx  metas.tsx  clientes.tsx  pedidos.tsx
    _seller/
      meus-pedidos.tsx  meus-clientes.tsx  minhas-metas.tsx
    assistente.tsx                IA (todos, conteúdo filtrado por role)
  api/public/
    webhooks/...                  futuro (Stripe, etc.)
```

Home pós-login por role: admin→`/dashboard`, op→`/producao-manteiga`, sales→`/comercial`, seller→`/meus-pedidos`.

## 9. Server functions (camada de aplicação)

Padrão: `createServerFn` + `requireSupabaseAuth` + Zod input validator. Nunca consultar Supabase com service role direto em loaders. Arquivos `*.functions.ts` em `src/lib/<modulo>/`.

Grupos:
- `auth.functions` — perfil atual, troca de org, convites
- `production.functions` — CRUD lotes manteiga/queijo, cálculo rendimento
- `inventory.functions` — movimentos, alertas de mínimo
- `sales.functions` — pedidos, faturamento, comissões
- `finance.functions` — DRE, lucro, despesas
- `reports.functions` — agregações para gráficos e export
- `ai.functions` — chat IA + geração de insights (chama AI Gateway)
- `admin.functions` — usuários, roles, plano

## 10. Dashboards por perfil

- **Admin**: faturamento, lucro líquido, margem, kg produzidos (manteiga+queijo), top clientes, canais, alertas IA.
- **Op Manager**: produção semanal, rendimento %, perdas kg/R$, estoque crítico, ordens em curso.
- **Sales Manager**: pipeline, metas vs realizado, ranking vendedores, clientes inativos.
- **Seller**: minhas vendas, minha meta (gauge), meus clientes, comissão estimada.

## 11. Assistente 360 IA

Duas camadas:

1. **Insights automáticos** (`ai_alerts`): job agendado (pg_cron → server route `/api/public/cron/ai-insights` com secret) roda regras + LLM:
   - queda de produção semanal > 10%
   - perda > X% do lote
   - estoque < `min_stock`
   - meta comercial < 70% do mês
   - cliente sem pedido há 30 dias
2. **Chat conversacional**: `/assistente` chama `ai.functions.chat` que usa Lovable AI Gateway com contexto da org (KPIs do mês, top alertas) — respostas em PT-BR, filtradas por role.

Conteúdo dos alertas filtrado por `target_role` para respeitar permissões.

## 12. Notificações

- Tabela `notifications` + realtime subscribe no topbar (badge + popover).
- Disparadas por triggers (estoque baixo, pedido novo) e pelo job de IA.
- Filtradas por `user_id` e role.

## 13. Mobile-first

- Sidebar vira `Sheet` em <md.
- KPI grid 1→2→4 colunas.
- Tabelas viram cards empilhados em <md.
- CTAs grandes, formulários em steps no mobile (produção, pedido).
- Testar viewport 411px (atual do usuário).

## 14. Performance & deploy

- Code splitting automático por rota TanStack.
- Lazy import de gráficos pesados.
- TanStack Query com staleTime adequado por módulo.
- Imagens em `src/assets`, otimizadas.
- Edge-ready (sem libs Node-only). Compatível com Vercel se migrar (TanStack Start build padrão).
- Sem `ssr.external`. Server functions evitam `child_process`, `sharp`, etc.

## 15. Observabilidade & auditoria

- `audit_log` para ações sensíveis (mudança de role, exclusão, ajuste de estoque, baixa de despesa).
- Logs de server functions via dashboard Lovable Cloud.
- Sentry/console capture já presente no template.

## 16. Roadmap de build em fases (economia de créditos)

Cada fase é um deploy funcional. Implementar uma por vez, validar, seguir.

```text
Fase 0 — Fundação (sem custo de IA)
  • Ativar Lovable Cloud
  • Migrations: organizations, profiles, app_role, user_roles
  • Trigger handle_new_user (cria org + admin role + trial)
  • Funções has_role / current_org_id
  • Auth (login, cadastro, reset, Google)
  • Layout _authenticated + redirecionamento por role
  • Onboarding wizard mínimo (nome do laticínio)

Fase 1 — Produção
  • Tabelas production_butter, production_cheese, inventory_items, inventory_movements
  • RLS + policies admin/op_manager
  • CRUD produção manteiga + queijo (server functions)
  • Cálculo automático rendimento e custo
  • Página /producao-manteiga e /producao-queijo
  • Estoque básico com alertas de mínimo

Fase 2 — Comercial
  • Tabelas customers, sales_orders, sales_order_items, goals, commissions
  • RLS para sales_manager e seller (apenas próprios)
  • CRUD pedidos + clientes + metas
  • Cálculo de comissão automático
  • Páginas /comercial, /clientes, /pedidos, /metas, /meus-pedidos

Fase 3 — Financeiro & Relatórios
  • Tabela expenses; agregações DRE
  • Dashboards admin (faturamento, lucro, margem)
  • Relatórios exportáveis (CSV/PDF)
  • Gráficos consolidados

Fase 4 — IA & Notificações
  • ai_alerts, notifications + realtime
  • Job pg_cron diário gerando insights (regras + LLM)
  • Chat /assistente com contexto da org
  • Notification popover no topbar

Fase 5 — Multiusuário avançado
  • Convites por email + aceitação
  • Tela /usuarios (admin gerencia roles)
  • audit_log + tela de auditoria

Fase 6 — Monetização
  • Trial countdown + paywall
  • Stripe (planos Pro mensal/anual)
  • Webhooks /api/public/webhooks/stripe
```

## 17. O que NÃO entra

- Pagamentos reais (apenas Fase 6, sob demanda).
- App nativo mobile (PWA é suficiente).
- Integrações externas (NF-e, ERPs) — futuro.
- IA com fine-tuning próprio — usar AI Gateway.

## 18. Decisões pendentes (a confirmar antes da Fase 0)

1. Confirmar **ativação do Lovable Cloud** agora (necessário a partir da Fase 0).
2. Confirmar **Google sign-in** além de email/senha.
3. Confirmar se cada signup cria sua própria organização (modelo padrão) ou se haverá apenas convite.
4. Confirmar moeda/locale: BRL + pt-BR (assumido).

Aprovado este plano, iniciamos pela **Fase 0** apenas, validamos, e seguimos incrementalmente.
