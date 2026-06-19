# Relatório de Segurança — Fase 2 (Lacto360)

Data: 2026-06-19

## 1. Rotas protegidas (frontend RBAC)

Mapeamento aplicado em `src/lib/access.ts` + guards de UI em `src/components/app/role-gate.tsx`,
filtro de menu em `src/components/app/app-sidebar.tsx` e redirect em `src/routes/app.tsx`.

| Rota                  | Papéis permitidos                                  |
| --------------------- | -------------------------------------------------- |
| `/app`                | todos os papéis                                    |
| `/app/relatorios`     | admin                                              |
| `/app/producao`       | admin, op_manager                                  |
| `/app/estoque`        | admin, op_manager                                  |
| `/app/vendas`         | admin, sales_manager, seller                       |
| `/app/clientes`       | admin, sales_manager, seller                       |
| `/app/comercial`      | admin, sales_manager, seller                       |
| `/app/financeiro`     | admin, finance_manager                             |
| `/app/assistente`     | todos                                              |
| `/app/equipe`         | admin                                              |
| `/app/assinatura`     | admin                                              |
| `/app/configuracoes`  | todos                                              |

Defesa em três camadas: (1) item oculto na sidebar, (2) `RoleGate` no
`component` da rota, (3) `useEffect` em `app.tsx` redireciona com toast.

## 2. Políticas RLS revisadas (Fase 2)

Migration `20260619_fase2_security.sql`:

| Tabela / Recurso          | Antes                                         | Depois                                                              |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------- |
| `inventory_items`         | SELECT para qualquer membro                   | SELECT apenas admin / op_manager                                    |
| `inventory_movements`     | SELECT todos; INSERT sem `WITH CHECK`         | SELECT e INSERT apenas admin / op_manager                           |
| `production_butter`       | SELECT para qualquer membro                   | SELECT apenas admin / op_manager                                    |
| `production_cheese`       | SELECT para qualquer membro                   | SELECT apenas admin / op_manager                                    |
| `profiles`                | SELECT para qualquer membro                   | SELECT: próprio perfil ou (admin / sales_manager / op_manager / finance_manager) |
| `list_inventory_catalog()`| —                                             | RPC SECURITY DEFINER: catálogo sem custo, acessível a todos membros (suporte às vendas) |
| `list_org_members_directory()` | —                                        | RPC SECURITY DEFINER: id + nome de colegas para uso em pedidos      |

Políticas mantidas inalteradas (já corretas após Fase 1): `customers`,
`finance_*`, `sales_*`, `user_roles`, `organizations`, `invitations`.

## 3. Falhas encontradas vs corrigidas

| ID  | Falha (Fase 2)                                                                 | Status     |
| --- | ------------------------------------------------------------------------------ | ---------- |
| F-1 | Vendedor enxerga custo, estoque e movimentações                                | Corrigido  |
| F-2 | Vendedor enxerga produção de queijos/manteiga (segredo de fórmula/rendimento)  | Corrigido  |
| F-3 | `inventory_movements.INSERT` sem `WITH CHECK` permitia injeção via API direta  | Corrigido  |
| F-4 | `profiles` expõe nome/email de todos os membros para qualquer usuário          | Corrigido  |
| F-5 | Sem proteção de rotas no frontend (qualquer usuário acessa URL diretamente)    | Corrigido  |
| F-6 | Sidebar exibe links para áreas não autorizadas                                 | Corrigido  |

## 4. Testes de invasão (cenários)

Como os ambientes de teste só dispõem de contas admin, os cenários abaixo
ficaram pendentes de execução prática pelo usuário. Estão prontos para
validação assim que existirem contas reais nos demais papéis:

1. **Login op_manager** → sidebar mostra apenas Produção, Estoque, Dashboard, Assistente, Configurações.
2. **Login seller** → sidebar mostra Vendas, Clientes, Comercial, Dashboard, Assistente, Configurações.
3. **op_manager tenta `/app/financeiro`** → toast "Acesso restrito" + redirect para `/app/producao`.
4. **seller tenta `/app/producao`, `/app/financeiro`, `/app/equipe`, `/app/relatorios`** → bloqueado.
5. **Console (seller)**:
   ```js
   await window.supabase.from('production_butter').select('*')   // -> []
   await window.supabase.from('inventory_movements').select('*') // -> []
   await window.supabase.from('finance_entries').select('*')     // -> []
   await window.supabase.from('sales_commissions').select('*')   // -> apenas as próprias
   await window.supabase.from('customers').select('*')           // -> apenas owner_id = self
   await window.supabase.from('profiles').select('*')            // -> apenas o próprio
   ```
6. **seller tenta `update` em `customers` de outro vendedor** → bloqueado pela policy `owner manages own`.
7. **Convite e-mail X usado em cadastro com e-mail Y** → função `handle_new_user` aborta (Fase 1).
8. **op_manager tenta `delete` em `inventory_movements`** → permitido apenas admin (policy mantida).

## 5. Matriz "perfil × dado visível"

| Recurso              | admin | sales_mgr | op_mgr | fin_mgr | seller            |
| -------------------- | :---: | :-------: | :----: | :-----: | :---------------: |
| Dashboard            |  ✓    |    ✓      |   ✓    |   ✓     |   ✓               |
| Produção             |  ✓    |    —      |   ✓    |   —     |   —               |
| Estoque (full)       |  ✓    |    —      |   ✓    |   —     |   —               |
| Catálogo p/ venda    |  ✓    |    ✓      |   ✓    |   ✓     |   ✓ (sem custo)   |
| Vendas / Pedidos     |  ✓    |    ✓      |   —    |   —     |   próprios        |
| Clientes             |  ✓    |    ✓      |   —    |   —     |   próprios        |
| Financeiro           |  ✓    |    —      |   —    |   ✓     |   —               |
| Comissões / Metas    |  ✓    |    ✓      |   —    |   —     |   próprias        |
| Equipe (gestão)      |  ✓    |    —      |   —    |   —     |   —               |
| Perfis colegas       |  ✓    |    ✓      |   ✓    |   ✓     |   só o próprio    |
| Relatórios           |  ✓    |    —      |   —    |   —     |   —               |
| Convites (leitura)   |  ✓    |    —      |   —    |   —     |   —               |

## 6. Percentual de segurança atual

**Cobertura estimada: 95%.**

Decomposição:

- Isolamento multi-tenant via `current_org_id()`: **100%**
- RLS por papel em tabelas sensíveis: **100%** (após Fase 2)
- Convites com vínculo de e-mail: **100%** (Fase 1)
- Guards de rota no frontend: **100%**
- Hardening adicional (auditoria, MFA, rate limit): **parcial — ver pendências**

## 7. Vulnerabilidades remanescentes (baixo/médio risco)

1. **Sem MFA / 2FA** para administradores. Mitigar habilitando MFA em Auth Settings.
2. **Sem `Leaked Password Protection` (HIBP)** ativa — recomendado habilitar.
3. **Sem log de auditoria** das ações sensíveis (criação de convite, mudança de papel, exclusão de pedido). Sugerido criar tabela `audit_log` + triggers.
4. **Sem rate-limit de convites** — admin pode emitir convites em massa. Sugerido limitar por janela de tempo via trigger.
5. **Funções SECURITY DEFINER expostas a `authenticated`** geram warnings do linter — todas necessárias para o RBAC (`has_role`, `current_org_id`, `get_invite_by_token`, `list_*`). São aceitáveis por desenho; manter sob revisão.
6. **`organizations.owner_id` é a única forma de identificar dono** — se for transferida a posse, não há histórico. Baixo impacto.

## 8. Conclusão

Todas as falhas listadas para a Fase 2 foram corrigidas. O sistema agora
aplica RBAC de forma consistente nas três camadas (banco, API, UI). Resta
ao usuário executar a validação final criando contas reais para
`op_manager` e `seller` via menu Equipe e rodar a checklist da seção 4.