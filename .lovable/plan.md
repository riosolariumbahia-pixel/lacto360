# Fase 3 — Financeiro

Transforma `app.financeiro.tsx` (hoje só mock) em módulo real integrado ao Supabase, com contas a receber geradas automaticamente a partir de pedidos confirmados e contas a pagar/despesas manuais.

## Escopo

**Dentro:**
- Categorias financeiras (receita/despesa)
- Contas a pagar / a receber (`finance_entries`)
- Geração automática de contas a receber quando pedido é confirmado
- Registro de pagamentos (baixa total/parcial)
- Dashboard: faturamento real, lucro, margem, DRE simplificado
- Fluxo de caixa (realizado + previsto) por mês
- Relatório de despesas por categoria

**Fora (fases futuras):**
- Conciliação bancária / OFX
- Boletos / PIX automatizado
- Centro de custos múltiplo
- Notas fiscais

## Banco de dados

```text
finance_categories
  id, org_id, name, kind ('receita'|'despesa'), color, is_active

finance_entries
  id, org_id, kind ('receivable'|'payable'),
  category_id, customer_id?, order_id?, supplier_name?,
  description, amount, due_date, status ('pendente'|'pago'|'parcial'|'cancelado'),
  paid_amount (default 0), paid_at?, payment_method?, notes,
  created_by, created_at, updated_at

finance_payments
  id, org_id, entry_id, amount, paid_at, method, notes, created_by
```

**Triggers:**
- `tg_order_to_receivable`: quando `sales_orders.status` muda `rascunho → confirmado`, cria `finance_entries (receivable)` com `amount = total`, `due_date = ordered_at + 30d`. Cancelar pedido marca a entrada como `cancelado`.
- `tg_apply_payment`: ao inserir em `finance_payments`, soma em `paid_amount`; se `>= amount` marca `pago` + `paid_at`, senão `parcial`.
- `tg_set_updated_at` nas duas tabelas.

**RLS:**
- `members read` para todos da org (leitura)
- `finance manage` (insert/update/delete) só para `admin` e novo papel `finance_manager`
- Atualizar enum `app_role` adicionando `finance_manager` (se não existir)

**Índices:** `(org_id, due_date)`, `(org_id, status)`, `(order_id)`.

## Camada de dados

`src/lib/finance.ts` com TanStack Query:
- `useCategories`, `useCreateCategory`
- `useEntries({ kind?, status?, from?, to? })`
- `useCreateEntry`, `useUpdateEntry`, `useCancelEntry`
- `useRegisterPayment`
- `useFinanceKPIs(periodMonths)` — faturamento, despesas, lucro, margem, em aberto a receber/pagar, vencidos
- `useCashFlow(months)` — agregação mensal realizado/previsto
- `useExpensesByCategory(period)`

## Frontend

**`src/routes/app.financeiro.tsx` (reescrita):**
Tabs:
1. **Visão Geral** — KPIs (faturamento, despesa, lucro, margem, a receber, a pagar, vencidos), gráfico Receita × Despesa × Lucro (AreaChart), fluxo previsto vs realizado.
2. **A Receber** — tabela filtrável (pendente/vencido/pago), badge de status, ação "Registrar pagamento" (dialog), origem (pedido vinculado).
3. **A Pagar** — tabela + botão "Nova despesa" (dialog: categoria, fornecedor, descrição, valor, vencimento), ação "Pagar".
4. **Categorias** — CRUD simples (nome, tipo, cor).
5. **Relatórios** — donut despesas por categoria, ranking top 10 despesas do mês.

**Permissões UI:** `seller` e `op_manager` veem apenas Visão Geral (read-only); botões de criar/pagar só para `admin` / `finance_manager` via `useCurrentRole()`.

**Sidebar:** entrada "Financeiro" já existe — sem mudança.

## Onboarding seed
Inserir categorias padrão na criação da org via `handle_new_user` ou trigger `after insert on organizations`:
- Receitas: Vendas, Outras receitas
- Despesas: Matéria-prima (leite), Embalagens, Energia, Salários, Transporte, Impostos, Outros

## Arquivos
- `supabase/migrations/<ts>_finance.sql` (tabelas + enum + RLS + triggers + seed function)
- `src/lib/finance.ts` (novo)
- `src/routes/app.financeiro.tsx` (reescrita)
- `src/integrations/supabase/types.ts` (auto-gerado)

## Roadmap restante
- **Fase 4** — Relatórios consolidados + IA (insights via Lovable AI: previsão de caixa, alertas de margem, sugestões de preço).
- **Fase 5** — Onboarding guiado + convites de equipe (`invitations` já existe, falta UI).
- **Fase 6** — Polimento, billing/trial, landing page.

Aprovar para eu executar a migração e implementar o módulo.