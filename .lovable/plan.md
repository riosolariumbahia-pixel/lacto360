Plano de correção:

1. **Liberar entrada imediata após cadastro**
   - Ajustar a autenticação para novas contas não ficarem bloqueadas por “Email not confirmed”.
   - Manter cadastro por e-mail/senha habilitado e impedir login anônimo.

2. **Garantir criação da empresa individual de cada conta**
   - Criar uma função segura no backend do app para, após cadastro ou login, garantir que o usuário tenha:
     - uma organização própria quando não veio por convite;
     - um perfil vinculado ao usuário;
     - o papel de administrador da própria empresa;
     - vínculo correto ao convite quando o cadastro veio por convite.
   - Isso corrige o problema atual em que existem funções no banco, mas nenhum gatilho ativo criando perfil/empresa automaticamente.

3. **Corrigir o fluxo de cadastro no app**
   - Depois de criar a conta, o app vai preparar os dados da empresa e entrar direto na conta, sem mandar o usuário para uma tela de login bloqueada por confirmação de e-mail.
   - Melhorar mensagens de erro de senha/e-mail para o usuário entender quando a senha foi recusada.

4. **Corrigir o fluxo de login de contas já cadastradas**
   - Ao entrar, o app vai limpar sessão antiga local, autenticar, recriar/validar os dados da empresa caso estejam faltando e então carregar a conta correta.
   - Isso evita mistura de dados entre empresas e evita conta criada sem perfil/organização ficar presa.

5. **Validar**
   - Conferir logs de autenticação e estrutura dos dados após a alteração.
   - Testar criação de nova conta e entrada em conta existente até chegar na área do app/onboarding corretamente.