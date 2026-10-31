# Blindagem comercial do Lacto360

## Achado importante (antes de tudo)
Hoje o botão "Fazer upgrade para Pro" altera o plano direto pelo navegador. Qualquer administrador consegue virar Pro sem pagar, e um usuário mal-intencionado poderia fazer isso pelas ferramentas do navegador. Antes de vender, isso precisa ser fechado.

## 1. Segurança e assinatura
- Travar no banco a mudança de plano: só o servidor poderá alterar `plan` e `trial_ends_at` (administradores continuam editando nome e onboarding).
- Criar uma checagem central "assinatura ativa" (Pro, ou trial dentro do prazo) usada:
  - no layout do app (redireciona para Assinatura com aviso via toast "Seu período de avaliação terminou. Ative o plano para continuar.");
  - no `RoleGate` (sem permissão → toast + volta para a página inicial do perfil, em vez de só mostrar bloqueio);
  - nas funções de servidor (assistente IA) via verificação autenticada da organização — o middleware gerado não é editado; a checagem fica em um middleware próprio encadeado depois dele.
- Conferir que todas as funções de servidor protegidas usam o middleware de autenticação e que o envio do token está registrado.
- Membros (não admin) com trial vencido continuam vendo a tela "peça ao administrador".

## 2. Erros em operações críticas
- `finance.ts`, `operations.ts`, `commercial.ts`: envolver cada gravação em um helper único `safeMutation` (try/catch) que registra a falha (`error-capture`) e lança uma mensagem amigável.
- Telas que chamam essas gravações mostram toast: "Não foi possível salvar os dados no momento. Verifique sua conexão." (ou a mensagem específica de permissão, quando for o caso).

## 3. Carregamento sem tela branca
- `kpi-card` e `chart-card`: nova propriedade `loading` que mostra Skeleton no lugar do valor/gráfico.
- `app.index`: já tem Skeleton; completar nos blocos restantes (clientes top, etc.) e usar `placeholderData` para não "piscar" ao recarregar em tempo real.
- `app.financeiro` e `app.vendas`: trocar textos "Carregando..." por Skeleton em KPIs, tabelas e listas; manter dados anteriores durante atualização.

## 4. Fluxo de assinatura
- Botão de checkout com estado "Processando..." (desabilitado, ícone girando), bloqueio contra clique duplo mesmo antes do re-render (trava por referência).
- Ativação do Pro passa a ser feita por uma função de servidor que confere se quem pediu é admin da organização. Ela fica pronta para ser trocada pela confirmação real de pagamento quando um provedor (Stripe/Paddle) for conectado — até lá continua o modo "piloto sem custo".

## Detalhes técnicos
- Migração: trigger `BEFORE UPDATE` em `organizations` que rejeita mudança de `plan`/`trial_ends_at` quando o papel do banco não é `service_role`; função `public.org_has_active_subscription(_org uuid)`.
- `src/lib/subscription.functions.ts`: `activateProPlan` (requireSupabaseAuth → verifica `has_role(admin)` via `context.supabase` → atualiza com admin client carregado dentro do handler).
- `src/lib/safe-mutation.ts` + uso nos três arquivos de `src/lib/`.
- Arquivos: `app.tsx`, `role-gate.tsx`, `session.ts`, `app.assinatura.tsx`, `ai.functions.ts`, `kpi-card.tsx`, `chart-card.tsx`, `app.index.tsx`, `app.financeiro.tsx`, `app.vendas.tsx`, `finance.ts`, `operations.ts`, `commercial.ts`.
- Teste: pequeno teste da regra "assinatura ativa" (Pro = ativo; trial vencido = inativo; trial no prazo = ativo).
- Validação: build, login como Guilherme, salvar um registro, simular trial vencido e conferir redirecionamento com aviso.
