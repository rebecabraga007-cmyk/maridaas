## Correção dos reference names

O Codemagic mostrou que os arquivos salvos em **Code signing identities** têm nomes diferentes do que tentamos usar. Os disponíveis são:

- Certificados: `Trinity life`, `Appdeploy`, `hangar wellof cert`, **`maridas cert`** (informado por você)
- Profiles: **`maridas provi`**

## Mudança em `codemagic.yaml`

Substituir o bloco `ios_signing` para usar os nomes reais (com aspas, pois contêm espaço):

```yaml
ios_signing:
  provisioning_profiles:
    - "maridas provi"
  certificates:
    - "maridas cert"
```

Nada mais muda. Após aprovação, basta rodar o build novamente no Codemagic.
