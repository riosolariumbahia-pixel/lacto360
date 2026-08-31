# Recuperar acesso às contas do Lacto360

## Objetivo
Restabelecer o backend hospedado e garantir que contas existentes e novos cadastros consigam autenticar, carregar sua empresa e entrar no sistema sem travar.

## Etapas
1. **Reativar o Lovable Cloud**
   - Retomar o backend atualmente pausado.
   - Aguardar o estado saudável antes de executar consultas ou alterações.

2. **Validar integridade das contas**
   - Conferir usuários, perfis, organizações e papéis.
   - Identificar contas sem perfil, organização ou papel e corrigir somente os vínculos inconsistentes.
   - Revisar o gatilho de criação de conta e a função de aceite de convite para impedir novas contas incompletas.

3. **Corrigir o fluxo de autenticação**
   - Garantir que login e cadastro sempre encerrem o estado de carregamento em falhas de rede ou autenticação.
   - Exibir uma mensagem clara quando o backend estiver temporariamente indisponível.
   - Preservar o isolamento entre organizações e atualizar a sessão após login, cadastro ou convite.
   - Evitar redirecionamentos repetidos entre login, onboarding e `/app`.

4. **Validar ponta a ponta**
   - Testar abertura das páginas públicas de login e cadastro.
   - Testar autenticação, logout e persistência após recarregar a página.
   - Testar criação de uma nova conta e confirmar perfil, organização e papel no banco.
   - Testar uma conta existente e o carregamento correto da organização associada.
   - Conferir build, erros de runtime e resposta da versão publicada.

## Resultado esperado
- Contas existentes entram normalmente.
- Novas contas são criadas com organização e papel administrativo próprios.
- Nenhum usuário visualiza dados de outra empresa.
- Botões não ficam presos em “Entrando...” ou “Criando...”.
- Falhas temporárias do backend são informadas sem travar a interface.
