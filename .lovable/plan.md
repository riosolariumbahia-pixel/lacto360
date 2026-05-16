# Fase 5 — Onboarding Guiado + Convites de Equipe

Conecta o `onboarding.tsx` (hoje só visual) ao backend real e adiciona gestão completa de convites/equipe usando a tabela `invitations` que já existe.

## Escopo

**Dentro:**
- Onboarding em 3 passos pós-cadastro: dados da empresa → primeiros cadastros (1 produto + 1 cliente opcional) → convidar equipe
- Detecção automática se a org já completou onboarding (flag `onboarded_at` em `organizations`); evita repetir
- Página `app.equipe.tsx` (nova) — lista membros + convites pendentes, criar/revogar/reenviar convite
- Aceite de convite via link `/convite/:token` — pré-preenche cadastro com email + token; o trigger `handle_new_user` já consome `invite_token` do metadata
- Papéis selecionáveis: admin, sales_manager, op_manager, finance_manager, seller, viewer
- Email de convite enviado via Lovable AI Gateway? Não — só link compartilhável (copiar para clipboard). Email fica para Fase 6.

**Fora:**
- Envio real de email transacional (próxima fase)
- Edição de papéis após aceite (só revogar/recriar)
- SSO/SAML

## Backend

### Migração
- Adicionar `onboarded_at timestamptz` em `organizations` (nullable)
- Policy adicional em `invitations`: permitir SELECT público apenas quando filtrado por `token` (já existe "anyone read invite by token") ✅
- Função `revoke_invitation(invite_id)` security definer — só admin da org

### Server functions (`src/lib/team.functions.ts`)
- `listTeam()` — retorna profiles + roles da org atual (requireSupabaseAuth)
- `listInvitations()` — convites pendentes da org
- `createInvitation({ email, role })` — admin only; retorna `{ token, link }`
- `revokeInvitation({ id })` — admin only
- `getInvitationByToken({ token })` — público (sem middleware), retorna org name + role para exibir no cadastro

### Server function (`src/lib/onboarding.functions.ts`)
- `completeOnboarding({ companyName?, firstProduct?, firstCustomer? })` — atualiza org, opcionalmente cria 1 inventory_item e 1 customer, marca `onboarded_at`

## Frontend

### `src/routes/onboarding.tsx` (reescrita conectada)
- Stepper 1/3 (já existe visualmente)
- Step 1: Nome da empresa (preenche `organizations.name`)
- Step 2: Primeiro produto (nome, unidade, preço) — opcional, pode pular
- Step 3: Convidar equipe (até 3 emails + papel cada) — opcional
- Botão "Concluir" → `completeOnboarding` + redireciona para `/app`
- Guard em `app.tsx`: se `org.onboarded_at` é null e usuário é admin, redirecionar para `/onboarding`

### `src/routes/app.equipe.tsx` (nova)
- `<PageHeader>` "Equipe"
- Card "Membros" — tabela com nome, email, papel, data de entrada
- Card "Convites pendentes" — tabela com email, papel, expira em, botão copiar link, botão revogar
- Diálogo "Convidar membro" — email + select de papel
- Visível apenas para admin (outros papéis veem mensagem)

### `src/routes/convite.$token.tsx` (nova)
- Loader chama `getInvitationByToken` (público)
- Mostra: "Você foi convidado para [Org] como [Papel]"
- Botão "Aceitar e criar conta" → redireciona para `/cadastro?token=xxx&email=yyy`
- Atualizar `cadastro.tsx` para ler `?token=` e injetar em `raw_user_meta_data.invite_token` no signUp

### Sidebar
- Adicionar item "Equipe" (`/app/equipe`) visível só para admin

## Permissões
- Equipe: admin gerencia; outros papéis sem acesso
- Onboarding: qualquer usuário recém-criado da org

## Arquivos
- `src/lib/team.functions.ts` (novo, server)
- `src/lib/onboarding.functions.ts` (novo, server)
- `src/routes/onboarding.tsx` (reescrita)
- `src/routes/app.equipe.tsx` (nova)
- `src/routes/convite.$token.tsx` (nova)
- `src/routes/cadastro.tsx` (edição: aceitar token via query)
- `src/routes/app.tsx` (guard de onboarding)
- `src/components/app/app-sidebar.tsx` (item Equipe)
- 1 migração: coluna `onboarded_at` + função `revoke_invitation`

## Roadmap restante
- **Fase 6** — Polimento, billing/trial real, landing page comercial, envio de email transacional dos convites

Aprovar para executar.
