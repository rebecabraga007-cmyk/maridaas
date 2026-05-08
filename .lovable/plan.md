## Correção do erro de parse YAML no codemagic.yaml

O Codemagic não aceitou o script Python inline (`python3 -c "..."`) na etapa `Increment build & marketing version` porque os `:` e a indentação do Python conflitam com o parser YAML.

## Mudança

Em `codemagic.yaml`, etapa `Increment build & marketing version`, substituir o bloco `python3 -c "..." > /tmp/asc_versions.tsv` por:

1. Heredoc com delimitador entre aspas (`<<'PY'`) que escreve o script para `/tmp/parse_asc.py` — aspas simples impedem expansão de shell e evitam confusão do YAML.
2. Em seguida `echo "$ASC_JSON" | python3 /tmp/parse_asc.py > /tmp/asc_versions.tsv`.

Toda a lógica de bump, fallback, detecção de versão bloqueante e seleção de `NEW_VERSION` permanece igual.

Arquivo alterado: apenas `codemagic.yaml`.