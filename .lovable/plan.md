## Fase 2 — Auditoria & Hardening de Segurança

### 1. Correções RLS no banco (migration única)

**Produção / Estoque** (atualmente qualquer membro lê)
- `inventory_items` → SELECT só para `admin` e `op_manager`.
- `inventory_movements` → SELECT só para `admin` e `op_manager`; INSERT exige `admin`/`op_manager` (hoje está `WITH CHECK` nulo, qualquer um insere).
- `production_butter` / `production_cheese` → SELECT só para `admin` e `op_manager`.
- Exceção controlada: vendedor precisa ver `inventory_items` para montar pedidos → criar **view `public.inventory_catalog`** (id, name, unit, sale_price, stock_qty) com `security_invoker=on` e policy `TO authenticated` liberando leitura para qualquer membro da org. Componentes de venda passam a consumir a view; telas de Estoque continuam na tabela base.

**Perfis / Equipe**
- `profiles`: remover policy `view org members profiles`. Substituir por: ver próprio perfil OU `has_role(admin)` na org. Criar view `public.org_members_directory` (id, full_name) com `security_invoker=on` para exibir nome do vendedor em pedidos sem vazar dados.
- `user_roles`: já está OK (admin lê todos da org; usuário lê o próprio). Sem mudança.
- `organizations.members read own org`: manter (necessário para nome do laticínio no sidebar).

**Convites / Movimentações**
- `inventory_movements.ops insert movements`: adicionar `WITH CHECK (org_id = current_org_id() AND (has_role admin OR op_manager))`.

### 2. Proteção de rotas no frontend (RBAC)

Criar helper `src/lib/access.ts` com mapa `ROUTE_ROLES`:
```
/app                  → todos
/app/producao         → admin, op_manager
/app/estoque          → admin, op_manager
/app/vendas           → admin, sales_manager, seller
/app/clientes         → admin, sales_manager, seller
/app/comercial        → admin, sales_manager, seller
/app/financeiro       → admin, finance_manager
/app/relatorios       → admin
/app/equipe           → admin
/app/assinatura       → admin
/app/assistente       → todos
/app/configuracoes    → admin
```

- Em `src/routes/app.tsx`: após `session.ready`, comparar `path` com `ROUTE_ROLES[path]`. Se papel não autorizado → `navigate({ to: homeForRole(session.role) })` + toast "Acesso negado".
- `AppSidebar`: filtrar items pelo papel (estender `NavItem` com `roles?: AppRole[]`).
- Cada página sensível (`app.producao`, `app.estoque`, `app.financeiro`, `app.relatorios`) recebe um guard inline `<RoleGate roles={[...]}>` que renderiza tela "Sem permissão" caso usuário acesse via URL direta antes do redirect.

### 3. Ajustes em código consumidor

- `src/lib/operations.ts` / `commercial.ts`: ao listar produtos para venda, trocar `from("inventory_items")` por `from("inventory_catalog")` quando role ≠ admin/op_manager (ou simplesmente sempre usar a view nas telas de venda).
- `src/lib/team.ts.listMembers`: continua restrito (só admin acessa a rota Equipe). Onde só precisamos do nome do vendedor (ex.: pedido), consumir `org_members_directory`.

### 4. Testes de invasão (executados via Playwright + psql)

Para cada perfil (admin, op_manager, seller) criado via convite real:
1. Login e navegação na sidebar — confirmar itens filtrados.
2. Tentar abrir URLs proibidas (`/app/financeiro`, `/app/producao` etc.) — esperar redirect + toast.
3. No console do navegador, executar `supabase.from('finance_entries').select('*')`, `from('production_butter')`, `from('inventory_movements')`, `from('customers')`, `from('sales_commissions')` — confirmar `[]` ou erro RLS.
4. Vendedor: tentar `from('customers').select('*')` — só vê próprios; tentar `update` em customer de outro vendedor — bloqueado.
5. Tentar trocar `id` em URLs de detalhe (`/app/vendas?order=<id-de-outro>`) — sem dados.
6. Tentar `from('profiles').select('*')` com não-admin — só retorna o próprio.
7. Tentar usar convite de e-mail X com cadastro de e-mail Y — bloqueado pela função `handle_new_user`.

### 5. Relatório final (`relatorio_seguranca_fase2.md`)

Inclui: rotas protegidas, policies revisadas, falhas encontradas/corrigidas, resultado dos testes de invasão por perfil, matriz "perfil × dado visível", percentual de segurança e vulnerabilidades remanescentes (ex.: ausência de 2FA, ausência de log de auditoria, rate limiting de convites).

### Detalhes técnicos

- View pattern com `security_invoker=on` + policy base table; ver `data-visibility-issues`.
- Guards do frontend não substituem RLS — são apenas UX. A segurança real está no banco.
- Migration única, idempotente (`DROP POLICY IF EXISTS`).
- Sem alteração em lógica de produção/vendas/financeiro além das permissões.

### Riscos / Observações

- A view `inventory_catalog` precisa permitir leitura por todos os membros (vendedor precisa para emitir pedido). Custo do produto (`cost_price`) **NÃO** entra na view — só admin/op_manager veem custo via tabela base.
- Se um usuário admin atual quiser testar como vendedor, precisa criar nova conta via convite (não dá para "trocar de papel" no mesmo usuário).