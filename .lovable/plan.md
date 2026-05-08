O problema é que o `versionCode` baseado em `date +%s + 100000` não garante unicidade contra tudo que já foi enviado ao Google Play. Pelo print, o Google Play já recebeu `1778366544`; se o build gerar um número menor ou igual, ele rejeita mesmo que seja outro arquivo AAB.

Plano de correção:

1. Atualizar somente `codemagic.yaml`, na etapa `Increment version code`.
2. Trocar a base local atual (`epoch + 100000`) por um número bem acima do último padrão já usado, por exemplo `date +%s + 1000000`, para sair imediatamente da faixa rejeitada.
3. Manter a consulta ao Google Play quando as credenciais funcionarem.
4. Se a consulta remota funcionar, continuar usando `max(REMOTE + 1, LOCAL)`.
5. Se a consulta remota falhar com credenciais presentes, continuar falhando o build, para não enviar outro AAB com versão conflitante.
6. Atualizar as mensagens de log para deixar claro qual `versionCode` final foi aplicado.

Resultado esperado: o próximo AAB terá `versionCode` maior que `1778366544` e maior que qualquer código remoto retornado pela API do Google Play.