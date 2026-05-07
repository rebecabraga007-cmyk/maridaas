## Mudança em `codemagic.yaml`

No workflow `android-release`, alterar:

```yaml
environment:
  java: 17   # → 21
```

## Por quê
O Capacitor Android atual compila com `sourceCompatibility = JavaVersion.VERSION_21`. O JDK 17 do Codemagic não reconhece source release 21, daí o erro `invalid source release: 21` em `:capacitor-android:compileReleaseJavaWithJavac`.

Subir para Java 21 alinha com a toolchain do Capacitor sem precisar editar arquivos gerados (que são recriados a cada `npx cap add android`).