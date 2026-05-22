## Objetivo

Substituir os dados mockados do dashboard (`src/routes/app.index.tsx`) por dados reais do Supabase, com atualização em tempo real, estados de loading/erro e consistência entre módulos.

## Diagnóstico atual

- **Dashboard (`app.index.tsx`)**: 100% mockado (`@/lib/mock-data`) — KPIs, gráficos de produção, financeiro, canais de venda e top clientes são todos falsos.
- **Relatórios (`app.relatorios.tsx`)**: já usa dados reais via `src/lib/reports.ts` + TanStack Query (apenas importa `fmtBRL` do mock — trivial).
- **Módulos operacionais** (`operations.ts`, `commercial.ts`, `finance.ts`): já leem/escrevem direto no Supabase corretamente. Triggers de DB já cuidam de:
  - venda confirmada → baixa estoque + cria contas a receber
  - produção → entrada de estoque
  - pagamento → atualiza status de `finance_entries`
- **RLS**: já isola por `org_id` via `current_org_id()` (corrigido na turn anterior).

Logo, o trabalho é **frontend de leitura agregada + realtime**, não mexer nas escritas nem na lógica de negócio.

## Mudanças

### 1. Nova camada `src/lib/dashboard.ts`

Funções de leitura agregada, todas filtradas implicitamente por `org_id` via RLS:

- `getDashboardKPIs()` — faturamento do mês (sum `finance_entries.paid_amount` kind=receivable do mês), lucro líquido (receita paga − despesa paga), produção mensal (sum `butter_kg + cheese_kg`), rendimento médio (avg `yield_percent`), contas a pagar/receber em aberto, ticket médio (avg `sales_orders.total` confirmados), pedidos concluídos, inadimplência (% entries vencidas), margem (%).
- `getWeeklyProduction()` — últimos 7 dias agrupando `production_butter` + `production_cheese` por dia.
- `getMonthlyFinance()` — últimos 8 meses: receita, despesa, lucro (via `finance_entries.paid_amount` + `paid_at`).
- `getSalesChannels()` — distribuição de `sales_orders.channel` no mês corrente (%).
- `getTopClients()` — top 5 por faturamento (sum `sales_orders.total` group by `customer_id`), join com `customers.name`, com progresso vs meta.
- Cálculos com guards contra NaN / divisão por zero / valores nulos.

### 2. Reescrita do `src/routes/app.index.tsx`

- Remover import de `@/lib/mock-data`.
- Cada seção usa `useQuery` com `queryKey` próprio e `staleTime: 30s`.
- Skeleton loaders por seção enquanto carrega.
- Empty states ("Cadastre seu primeiro pedido…") quando arrays vazios.
- Toast de erro em falha.
- Manter layout/visual atual.

### 3. Realtime no `src/routes/app.tsx`

Hook único que assina canais Postgres para `sales_orders`, `sales_order_items`, `finance_entries`, `finance_payments`, `production_butter`, `production_cheese`, `customers`, `inventory_items` — em cada evento chama `queryClient.invalidateQueries({ queryKey: ["dashboard"] })` e `["rep"]`. Cleanup no unmount.

### 4. Migração para habilitar realtime

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE
  sales_orders, sales_order_items, finance_entries, finance_payments,
  production_butter, production_cheese, customers, inventory_items;
ALTER TABLE ... REPLICA IDENTITY FULL;  -- nas mesmas tabelas
```

### 5. Limpeza

- Mover `fmtBRL` e `fmtNum` de `mock-data.ts` para `src/lib/utils.ts` (ou exportar de `dashboard.ts`) e atualizar imports em `app.relatorios.tsx`.
- Deletar `src/lib/mock-data.ts`.

## Fora do escopo (não vou mexer)

- Auth, RLS, login, onboarding — já funcionando.
- `reports.ts` — já real, apenas redirecionar import de `fmtBRL`.
- Lógica de escrita dos módulos (já correta e coberta por triggers).
- Performance avançada (paginação infinita, virtualização) — fora do escopo desta auditoria.

## Arquivos afetados

- ✏️ `src/routes/app.index.tsx` (reescrita)
- ✏️ `src/routes/app.tsx` (adiciona realtime hook)
- ✏️ `src/routes/app.relatorios.tsx` (troca import `fmtBRL`)
- ✏️ `src/lib/utils.ts` (adiciona `fmtBRL`/`fmtNum`)
- ➕ `src/lib/dashboard.ts`
- ➕ migração SQL (publication realtime)
- 🗑️ `src/lib/mock-data.ts`
