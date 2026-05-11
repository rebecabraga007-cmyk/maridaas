import { Link } from "react-router-dom";
import { Mail, Clock, HelpCircle, UserX, Shield, FileText, ArrowLeft } from "lucide-react";
import SEOHead from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const SUPPORT_EMAIL = "rebeca.braga007@gmail.com";

const faqs = [
  {
    q: "Como recupero minha senha?",
    a: 'Na tela de login, toque em "Esqueci minha senha" e siga as instruções enviadas para o e-mail cadastrado.',
  },
  {
    q: "Como cancelo minha assinatura?",
    a: "Abra o app, vá até seu Perfil, depois em Assinatura e toque em Cancelar. Se você assinou pela App Store, também pode gerenciar nas configurações da sua Apple ID.",
  },
  {
    q: "Como excluo minha conta?",
    a: `Envie um e-mail para ${SUPPORT_EMAIL} com o assunto "Solicitação de exclusão de conta". Sua conta e seus dados pessoais serão removidos permanentemente em até 48 horas úteis.`,
  },
  {
    q: "Como reporto um bug?",
    a: `Envie um e-mail para ${SUPPORT_EMAIL} descrevendo o problema, o modelo do seu dispositivo e a versão do app. Capturas de tela são bem-vindas.`,
  },
];

const Support = () => {
  return (
    <div className="min-h-screen bg-white text-foreground">
      <SEOHead
        title="Suporte Maridaas — Central de Ajuda e Contato"
        description="Suporte da Maridaas: contato, perguntas frequentes, exclusão de conta, assinaturas e privacidade. Resposta em até 24–48 horas úteis."
        canonical="https://maridaas.lovable.app/support"
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
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight mb-4">
            Suporte Maridaas
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Bem-vinda ao Suporte da Maridaas. Nossa equipe está disponível para ajudar com
            problemas técnicos, dúvidas sobre conta, assinaturas, feedback e solicitações
            relacionadas à privacidade.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">E-mail de suporte</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="mb-3">
                Envie uma mensagem e responderemos o quanto antes.
              </CardDescription>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="text-primary font-medium break-all hover:underline"
              >
                {SUPPORT_EMAIL}
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Tempo de resposta</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Respondemos em até <strong className="text-foreground">24–48 horas úteis</strong>,
                de segunda a sexta-feira.
              </CardDescription>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Perguntas frequentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((item, i) => (
                  <AccordionItem key={i} value={`item-${i}`}>
                    <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </section>

        <section className="mb-8">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                  <UserX className="h-5 w-5 text-destructive" />
                </div>
                <CardTitle className="text-lg">Excluir sua conta</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription>
                Você pode solicitar a exclusão permanente da sua conta e de todos os dados
                pessoais associados a qualquer momento. Envie um e-mail para{" "}
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20conta`} className="text-primary hover:underline">
                  {SUPPORT_EMAIL}
                </a>{" "}
                com o assunto <strong className="text-foreground">"Solicitação de exclusão de conta"</strong>.
                Sua solicitação será processada em até 48 horas úteis.
              </CardDescription>
              <Button asChild variant="outline">
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Solicita%C3%A7%C3%A3o%20de%20exclus%C3%A3o%20de%20conta`}>
                  Solicitar exclusão de conta
                </a>
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 mb-12">
          <Button asChild variant="outline" size="lg" className="h-14">
            <Link to="/privacidade">
              <Shield className="h-5 w-5" />
              Política de Privacidade
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="h-14">
            <Link to="/termos">
              <FileText className="h-5 w-5" />
              Termos de Uso
            </Link>
          </Button>
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

export default Support;
