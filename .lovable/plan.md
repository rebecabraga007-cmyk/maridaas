## Problema

O build subiu, foi processado e entrou no TestFlight (`WAITING_FOR_REVIEW`) com sucesso. O que falhou foi a etapa seguinte — submissão para a **App Store** (loja pública):

> 409: A relationship value is not acceptable for the current resource state. The specified pre-release build could not be added.

Isso acontece porque já existe um `App Store Version` 1.1.1 em estado `WAITING_FOR_REVIEW` na App Store Connect. A Apple não permite trocar o build vinculado a uma versão que já está aguardando revisão — a versão precisa ser rejeitada/cancelada manualmente, ou um novo número de versão (ex: 1.1.2) precisa ser criado.

Como nosso workflow já incrementa automaticamente o `MARKETING_VERSION` consultando a versão remota mais recente, o problema real é que **estamos tentando submeter para a loja pública a cada build**, o que é raramente o que se quer (normalmente cada release pública é uma decisão manual, e builds intermediários vão só pro TestFlight).

## Plano

Desligar a submissão automática para a App Store no `codemagic.yaml`, mantendo apenas o envio automático para o TestFlight.

### Mudança em `codemagic.yaml` (workflow `ios-release`)

No bloco `publishing.app_store_connect`:

```yaml
publishing:
  app_store_connect:
    auth: integration
    submit_to_testflight: true
    submit_to_app_store: false   # antes: true
```

### Resultado esperado

- Builds continuam subindo e indo automaticamente para o TestFlight (testers internos recebem)
- Erro 409 da App Store some — não tentamos mais mexer na versão pública
- Quando você quiser publicar uma versão na loja, faz manualmente pelo App Store Connect (selecionar o build do TestFlight, preencher notas e enviar para review)

### Alternativa (se você quiser manter submissão automática para a loja)

Em vez de desligar, teríamos que: (1) detectar uma `App Store Version` existente em `WAITING_FOR_REVIEW`, (2) cancelá-la via API antes de submeter o novo build, ou (3) sempre criar uma nova versão (ex: 1.1.2, 1.1.3...) o que polui a App Store Connect com versões nunca lançadas. Não recomendo — release pública deveria ser uma decisão consciente.

### Observação

O TestFlight beta review (que apareceu como `WAITING_FOR_REVIEW` no log) é diferente da App Store review — o primeiro é só para liberar para testers externos, não bloqueia testers internos nem builds futuros.
