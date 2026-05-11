## Página /marketing — Kit de Imprensa Maridaas

Criar uma página pública (mas com `noindex`) destinada a jornalistas, parceiros e criadores de conteúdo, com informações oficiais da marca, recursos visuais e contato de imprensa.

### Rota e acesso

- Nova rota `/marketing` registrada em `src/App.tsx`, fora do `ProtectedRoute` (acesso sem login).
- `SEOHead` com `noindex` ativado para não aparecer em buscadores.
- Title: "Kit de Imprensa — Maridaas"
- Meta description curta em PT-BR.

### Estrutura da página (mobile-first, mesmo estilo SaaS limpo do /support)

1. **Header** simples com link de volta para `/`.
2. **Hero**
   - Logo da Maridaas (usar `/logo.png` já existente).
   - Título: "Kit de Imprensa".
   - Subtítulo: "Recursos oficiais, identidade visual e contatos para imprensa, parceiros e criadores de conteúdo."
3. **Sobre a Maridaas** (card)
   - Boilerplate curto (2–3 parágrafos) descrevendo o app: rede social de bairro feita por e para mulheres, foco em vizinhança, serviços locais e segurança.
4. **Fatos rápidos** (grid de cards com ícones)
   - Categoria: Rede social / comunidade local
   - Público: Mulheres
   - Disponível em: iOS, Android e Web (PWA)
   - Sede: Brasil
5. **Identidade visual** (card)
   - Paleta oficial (teal, dourado, rosa salmão) exibida com swatches usando os tokens do design system.
   - Tipografia: Quicksand (títulos) e Nunito (corpo).
   - Botão "Baixar logo (PNG)" apontando para `/logo.png`.
6. **Contato de imprensa** (card destacado)
   - E-mail: `rebeca.braga007@gmail.com` com `mailto:` e assunto pré-preenchido "Imprensa — Maridaas".
   - Tempo de resposta: 24–48h úteis.
7. **Links úteis** (botões)
   - Site / App → `/`
   - Suporte → `/support`
   - Política de Privacidade → `/privacidade`
   - Termos de Uso → `/termos`
8. **Footer** com copyright, igual ao do /support.

### Detalhes técnicos

- Arquivo novo: `src/pages/Marketing.tsx`.
- Reutiliza `Card`, `Button`, `SEOHead`, ícones `lucide-react` (`Newspaper`, `Mail`, `Palette`, `Download`, `Shield`, `FileText`, `LifeBuoy`, `ArrowLeft`).
- Usa apenas tokens semânticos do design system (sem cores hardcoded).
- Swatches da paleta renderizados com `bg-primary`, `bg-secondary`, `bg-accent` etc.
- `App.tsx`: import de `Marketing` e `<Route path="/marketing" element={<Marketing />} />` ao lado das demais rotas públicas.
- Sem alterações de backend, sem nova dependência.

### Fora de escopo

- Não cria área administrativa de campanhas.
- Não adiciona formulário de contato (apenas mailto).
- Não altera SEO de outras páginas.
