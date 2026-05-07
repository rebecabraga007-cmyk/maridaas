## Gerar screenshots para iPad 13"

Apple exige para iPad com tela de 13 pol.: **2064 × 2752 px** (retrato), até 10 capturas.

### Plano

1. Navegar no preview com viewport tablet (~1024×1366) e capturar 3 telas:
   - Landing
   - Auth/Login
   - Card de segurança / seção destaque
2. Redimensionar via Python/PIL para **2064 × 2752** (retrato), com upscale LANCZOS de alta qualidade, mesma abordagem das capturas iPhone 6,5".
3. Salvar em `/mnt/documents/appstore-screenshots/maridaas-ipad13-{1,2,3}-2064x2752.png`.
4. Entregar via `<lov-artifact>` para download.

### Observações

- Sem texto promocional, capturas cruas (mesma escolha do iPhone).
- Sem sessão autenticada disponível — telas internas (Feed/Serviços/Mural) exigiriam login no preview. Se quiser essas, faça login no preview e me avise.
