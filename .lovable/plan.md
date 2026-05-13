# Fase 2 — Módulo Comercial

Backend real (Lovable Cloud) + UI conectada para Clientes, Pedidos, Metas e Comissões, respeitando RLS multi-tenant e papéis (admin, op_manager, sales_manager, seller).

## Escopo

1. **Clientes (CRM básico)** — cadastro, edição, status (ativo/inativo), histórico de pedidos.
2. **Pedidos de venda** — criação multi-item, vínculo a cliente e vendedor, status (rascunho, confirmado, em rota, entregue, cancelado), baixa automática de estoque ao confirmar.
3. **Metas** — meta mensal por vendedor (kg e/ou R$), progresso calculado a partir dos pedidos.
4. **Comissões** — % por vendedor, cálculo automático sobre pedidos entregues no período.

## Banco de dados (migração única)

```text
customers
  id, org_id, name, doc (CPF/CNPJ), email, phone,
  city, state, status ('ativo'|'inativo'),
  credit_limit, payment_terms, notes
  -- índice: (org_id), (org_id, status)

sales_orders
  id, org_id, code (auto), customer_id, seller_id,
  status ('rascunho'|'confirmado'|'em_rota'|'entregue'|'cancelado'),
  channel ('balcao'|'rota'|'whatsapp'|'distribuidor'),
  subtotal, discount, total, notes,
  ordered_at, delivered_at

sales_order_items
  id, order_id, item_id (FK inventory_items),
  quantity, unit_price, total

sales_targets
  id, org_id, seller_id, period (date - 1º dia do mês),
  target_kg, target_brl
  -- unique (org_id, seller_id, period)

sales_commissions
  id, org_id, seller_id,
  commission_percent  -- vigente
  -- unique (org_id, seller_id)
```

### Triggers
- `tg_sales_order_total`: recalcula `subtotal/total` ao inserir/alterar `sales_order_items`.
- `tg_sales_order_stock`: ao mudar `status` para `confirmado`, gera `inventory_movements` tipo `out` para cada item; ao `cancelado` (vindo de confirmado+), reverte.
- `tg_set_updated_at` nas tabelas com `updated_at`.

### RLS (padrão da Fase 1)
- **customers / sales_targets / sales_commissions**:
  - SELECT: membros da org.
  - ALL: admin OR sales_manager.
- **sales_orders / sales_order_items**:
  - SELECT: admin/sales_manager veem tudo da org; seller vê apenas `seller_id = auth.uid()`.
  - INSERT/UPDATE: admin, sales_manager, ou seller (apenas próprios pedidos).
  - DELETE: admin.
- Helper já existe: `has_role(user, org, role)` + `current_org_id()`.

## Camada de dados frontend

`src/lib/commercial.ts` (espelha `operations.ts`):
- `useCustomers()`, `useCreateCustomer()`, `useUpdateCustomer()`
- `useSalesOrders(filters)`, `useCreateOrder()`, `useUpdateOrderStatus()`
- `useSellers()` (lista profiles com role seller/sales_manager via `user_roles` join)
- `useTargets(period)`, `useUpsertTarget()`
- `useCommissions()`, `useUpsertCommission()`
- KPIs derivados (faturamento mês, ticket médio, top clientes) via `useQuery` com agregação client-side.

## UI — páginas atualizadas

**`app.clientes.tsx`** (real)
- KPIs: total, ativos no mês, ticket médio.
- Tabela com busca + filtro status.
- Diálogos: novo cliente / editar cliente.
- Drawer lateral: histórico dos últimos pedidos do cliente selecionado.

**`app.vendas.tsx`** (real)
- KPIs: pedidos do mês, faturamento, ticket médio, manteiga/queijo (kg) vendidos.
- Tabela de pedidos com filtros (status, vendedor, período).
- Diálogo "Novo pedido": cliente + vendedor + linhas (item, qtd, preço) com cálculo em tempo real, botão "Salvar rascunho" / "Confirmar".
- Ações por linha: confirmar, marcar em rota, entregue, cancelar.
- Pizza de canais a partir de dados reais.

**Nova página `app.comercial.tsx`** (Metas & Comissões — visível para admin/sales_manager)
- Aba Metas: lista vendedores × meta do mês (kg, R$) × progresso (barra) × atingimento.
- Aba Comissões: % por vendedor + cálculo do período (faturamento entregue × %).
- Adicionar entrada na sidebar entre "Vendas" e "Financeiro".

## Permissões na UI
- Helper `useCurrentRole()` (já temos sessão); ocultar botões "Novo cliente / Confirmar pedido / Editar metas" para `seller`.
- Seller na página de Vendas vê só seus pedidos (RLS já garante; UI só esconde filtro de vendedor).

## Fora de escopo (próximas fases)
- Notas fiscais / impressão de pedido.
- Rotas de entrega geolocalizadas.
- Integração financeira (contas a receber) — Fase 3.
- Comissão por faixa/produto (só % flat agora).

## Roadmap após esta fase
- **Fase 3** — Financeiro (contas a pagar/receber, fluxo de caixa, vínculo com pedidos).
- **Fase 4** — Relatórios consolidados + IA (insights via Lovable AI Gateway).
- **Fase 5** — Onboarding produtivo + convites de membros funcionais.

Confirmar com **"implementar"** para eu rodar a migração e construir a Fase 2.