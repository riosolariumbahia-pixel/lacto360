# Correções dos fluxos de conta e assinatura

## Regras confirmadas
- Pro: R$ 97/mês, cobrado imediatamente, liberado para a empresa conforme cada perfil.
- Cancelamento comum: acesso até o fim do período pago, sem troca de planos.
- Reembolso integral: cancelamento e bloqueio imediato da assinatura correspondente.
- Convites não transferem contas entre laticínios.

## Implementação
1. Proteger no banco o vínculo de empresa, a consulta de assinatura e o acesso aos dados operacionais após vencimento, preservando acesso à conta e contratação.
2. Tornar o perfil realmente persistente; direcionar o botão de upgrade ao pagamento; melhorar recuperação de senha.
3. Recuperar sessões de checkout expiradas sem duplicação, escolher o cliente correto no portal e adicionar atualização verificada de assinatura.
4. Processar reembolso integral com evento assinado e revogação imediata; atualizar as assinaturas recebidas e renovar o estado exibido.
5. Testar regras, permissões e fluxos autenticados disponíveis; registrar o que depende da ativação do Stripe.

## Detalhes técnicos
Manter o gateway Stripe, funções autenticadas, checkout embutido, reservas duráveis e separação test/live. Migrações aditivas com RLS restritiva e verificação de identidade. Cancelamento por reembolso usa estado explícito para não preservar indevidamente o período já devolvido.

## Teste na prévia
Após reivindicar a conta e resolver a configuração tributária, contratar com cartão de teste 4242 4242 4242 4242, validade futura e CVC de três dígitos; confirmar registro, cancelar no portal, testar recusa, reembolso integral e isolamento de empresas. Pagamento de teste nunca concede acesso real.