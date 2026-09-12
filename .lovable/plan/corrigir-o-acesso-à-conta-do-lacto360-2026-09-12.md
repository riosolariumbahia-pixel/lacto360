# Corrigir o acesso à conta do Lacto360

## Diagnóstico confirmado
- O backend hospedado está disponível e respondendo normalmente.
- A autenticação da conta informada foi aceita com sucesso às 20:31 de hoje.
- A conta possui perfil, empresa e papel de administrador consistentes; não há vínculo ausente ou divergente.
- O bloqueio acontece no navegador depois da autenticação: a sessão é carregada por caminhos concorrentes, executa novas consultas durante eventos de autenticação e pode manter a tela em “Entrando...” ou “Carregando...”.
- O tratamento atual também não encerra o carregamento quando uma chamada lança erro de rede, e o ouvinte global atualiza todas as consultas até em eventos automáticos de sessão.

## Correções
1. **Estabilizar a sessão após o login**
   - Centralizar a inicialização e atualização da sessão para impedir carregamentos simultâneos.
   - Não consultar perfil e permissões dentro do bloqueio do evento de autenticação; agendar a atualização com segurança.
   - Validar a identidade atual antes de liberar o acesso e manter perfil, empresa e papel sincronizados.

2. **Impedir telas travadas**
   - Garantir que login e cadastro sempre saiam de “Entrando...” ou “Criando...”, inclusive em erro inesperado, indisponibilidade ou demora excessiva.
   - Mostrar mensagens claras e permitir nova tentativa sem recarregar dados de outra conta.
   - Remover redirecionamentos concorrentes entre login, onboarding e área interna.

3. **Corrigir limpeza e troca de conta**
   - Cancelar e limpar dados protegidos antes do logout.
   - Atualizar o aplicativo somente nos eventos relevantes de entrada, saída e alteração de usuário.
   - Preservar o isolamento por empresa e impedir que dados em memória sobrevivam à troca de conta.

4. **Validar o acesso real**
   - Executar login autenticado na prévia com a sessão disponível, confirmar entrada na área interna e recarregar a página.
   - Confirmar que empresa e papel carregados correspondem à conta autenticada.
   - Testar logout e verificar que voltar no navegador não reabre conteúdo protegido.
   - Verificar erros de execução, chamadas de rede e build final.

## Resultado esperado
- O login entra imediatamente na conta correta.
- A tela não permanece em “Entrando...” ou “Carregando...”.
- Recarregar a página mantém a sessão válida.
- Logout e troca de conta removem todos os dados da conta anterior.
