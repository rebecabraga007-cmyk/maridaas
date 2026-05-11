import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Palette,
  Download,
  Shield,
  FileText,
  LifeBuoy,
  Newspaper,
  Users,
  Smartphone,
  MapPin,
  Tag,
} from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PRESS_EMAIL = "rebeca.braga007@gmail.com";

const facts = [
  { icon: Tag, label: "Categoria", value: "Rede social de bairro" },
  { icon: Users, label: "Público", value: "Mulheres" },
  { icon: Smartphone, label: "Plataformas", value: "iOS, Android e Web (PWA)" },
  { icon: MapPin, label: "Sede", value: "Brasil" },
];

const palette = [
  { name: "Teal", className: "bg-primary", hint: "Primária" },
  { name: "Dourado", className: "bg-secondary", hint: "Secundária" },
  { name: "Rosa salmão", className: "bg-accent", hint: "Destaque" },
];

const Marketing = () => {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <SEOHead
        title="Kit de Imprensa — Maridaas"
        description="Recursos oficiais, identidade visual e contatos de imprensa da Maridaas, a rede social de bairro feita por e para mulheres."
        noindex
      />

      <header className="border-b border-border bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground" aria-label="Voltar para o início">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <span className="font-semibold">Maridaas</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 sm:py-16">
        <section className="text-center mb-10 sm:mb-14">
          <img
            src="/logo.png"
            alt="Logotipo da Maridaas"
            className="h-20 w-20 mx-auto mb-6 rounded-2xl shadow-card"
          />
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <Newspaper className="h-3.5 w-3.5" />
            Kit de imprensa
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Kit de Imprensa Maridaas
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Recursos oficiais, identidade visual e contatos para imprensa, parceiros e criadores
            de conteúdo.
          </p>
        </section>

        <section className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sobre a Maridaas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                A Maridaas é uma rede social de bairro feita por e para mulheres. A plataforma
                conecta vizinhas, fortalece comunidades locais e cria um espaço seguro para troca
                de informações, serviços e apoio mútuo.
              </p>
              <p>
                As usuárias podem participar de até dois bairros, publicar no mural, divulgar
                serviços locais, fazer amizades e conversar diretamente com vizinhas próximas —
                tudo com foco em segurança, privacidade e respeito.
              </p>
              <p>
                Disponível para iOS, Android e Web, a Maridaas combina o calor de uma comunidade
                local com a praticidade de um aplicativo moderno.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Fatos rápidos
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {facts.map(({ icon: Icon, label, value }) => (
              <Card key={label}>
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {label}
                    </div>
                    <div className="font-medium">{value}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Identidade visual</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-3">
                  Paleta oficial
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {palette.map((c) => (
                    <div key={c.name} className="text-center">
                      <div
                        className={`${c.className} h-16 w-full rounded-xl shadow-card mb-2`}
                        aria-label={c.name}
                      />
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">{c.hint}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">
                  Tipografia
                </div>
                <p className="text-sm">
                  <span className="font-semibold" style={{ fontFamily: "Quicksand, sans-serif" }}>
                    Quicksand
                  </span>{" "}
                  para títulos e{" "}
                  <span style={{ fontFamily: "Nunito, sans-serif" }}>Nunito</span> para textos.
                </p>
              </div>

              <Button asChild variant="outline">
                <a href="/logo.png" download>
                  <Download className="h-4 w-4" />
                  Baixar logotipo (PNG)
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8">
          <Card className="border-primary/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Contato de imprensa</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>
                Para entrevistas, parcerias, materiais adicionais ou pedidos de imprensa, fale
                com nossa equipe. Respondemos em até{" "}
                <strong className="text-foreground">24–48 horas úteis</strong>.
              </CardDescription>
              <a
                href={`mailto:${PRESS_EMAIL}?subject=Imprensa%20%E2%80%94%20Maridaas`}
                className="text-primary font-medium break-all hover:underline block"
              >
                {PRESS_EMAIL}
              </a>
              <Button asChild>
                <a href={`mailto:${PRESS_EMAIL}?subject=Imprensa%20%E2%80%94%20Maridaas`}>
                  <Mail className="h-4 w-4" />
                  Enviar e-mail para imprensa
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Links úteis
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button asChild variant="outline" size="lg" className="h-14 justify-start">
              <Link to="/">
                <Newspaper className="h-5 w-5" />
                Site / App
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 justify-start">
              <Link to="/support">
                <LifeBuoy className="h-5 w-5" />
                Suporte
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 justify-start">
              <Link to="/privacidade">
                <Shield className="h-5 w-5" />
                Política de Privacidade
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 justify-start">
              <Link to="/termos">
                <FileText className="h-5 w-5" />
                Termos de Uso
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Maridaas. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
};

export default Marketing;
