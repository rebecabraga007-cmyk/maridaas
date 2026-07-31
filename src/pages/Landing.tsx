import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Heart, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/safeClient";
import SEOHead from "@/components/SEOHead";
import Logo from "@/components/Logo";
import SignupFlow from "@/components/auth/SignupFlow";
import HeroQuickSignup from "@/components/landing/HeroQuickSignup";
import SocialProof from "@/components/landing/SocialProof";
import StickyMobileCta from "@/components/landing/StickyMobileCta";

const Landing = () => {
  const navigate = useNavigate();
  const [signupOpen, setSignupOpen] = useState(false);
  const [signupEmail, setSignupEmail] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/feed", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/feed", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const openSignup = (email?: string) => {
    setSignupEmail(email ?? "");
    setSignupOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Maridaas — Sua comunidade de bairro"
        description="Troque serviços com suas vizinhas de forma segura e prática. Cadastro grátis em menos de 30 segundos."
        canonical="https://maridaas.lovable.app/"
      />

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Maridaas",
            url: "https://maridaas.lovable.app",
            description:
              "Rede social de bairro para conectar vizinhas, descobrir serviços e fortalecer comunidades locais.",
            applicationCategory: "SocialNetworkingApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "BRL",
            },
          }),
        }}
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Logo variant="logo" size={40} alt="Maridaas - Logo" className="h-10 w-10" priority />
            <span className="text-xl font-display font-bold text-foreground">Maridaas</span>
          </div>
          <nav className="flex items-center gap-3" aria-label="Navegação principal">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Button size="sm" className="btn-maridaas" onClick={() => openSignup()}>
              Criar conta
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4" aria-labelledby="hero-title">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-light text-primary mb-6">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              <span className="text-sm font-medium">Sua vizinhança mais conectada</span>
            </div>

            <h1 id="hero-title" className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
              Troque serviços com sua{" "}
              <span className="text-primary">comunidade</span>{" "}
              de bairro, com segurança
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Descubra prestadoras de confiança recomendadas por vizinhas de verdade, faça
              amizades e fortaleça os laços do seu bairro. Cadastro grátis em menos de 30 segundos.
            </p>

            <HeroQuickSignup onOpenSignup={openSignup} />
            <SocialProof />

            <div className="mt-10">
              <a href="#como-funciona" onClick={(e) => handleScrollTo(e, "como-funciona")} className="text-sm text-muted-foreground hover:text-primary underline underline-offset-4">
                Ver como funciona
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="como-funciona" className="py-20 px-4 bg-muted/50" aria-labelledby="features-title">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 id="features-title" className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              Como funciona a Maridaas
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Uma rede social pensada para fortalecer comunidades locais
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<MapPin className="w-8 h-8" />}
              title="Grupos por Bairro"
              description="Cada bairro tem seu próprio grupo. Conecte-se com quem realmente mora perto de você."
              color="primary"
            />
            <FeatureCard
              icon={<Heart className="w-8 h-8" />}
              title="Serviços de Confiança"
              description="Encontre prestadoras de serviço recomendadas por suas vizinhas. Avaliações reais de pessoas reais."
              color="secondary"
            />
            <FeatureCard
              icon={<MessageCircle className="w-8 h-8" />}
              title="Mural da Comunidade"
              description="Compartilhe novidades, peça recomendações e fique por dentro do que acontece no seu bairro."
              color="accent"
            />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-4" aria-labelledby="trust-title">
        <div className="container mx-auto max-w-4xl">
          <div className="card-maridaas p-8 md:p-12 text-center gradient-primary text-primary-foreground">
            <ShieldCheck className="w-16 h-16 mx-auto mb-6 opacity-90" aria-hidden="true" />
            <h2 id="trust-title" className="text-2xl md:text-3xl font-display font-bold mb-4">
              Segurança e Confiança
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
              Verificamos a identidade de cada usuária. Você só interage com pessoas
              que realmente moram no seu bairro.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="h-12 text-primary font-semibold"
              onClick={() => openSignup()}
            >
              Fazer parte da comunidade
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 pb-24 md:pb-12 border-t border-border" role="contentinfo">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Logo variant="logo" size={32} alt="Maridaas" className="h-8 w-8" />
              <span className="font-display font-bold text-foreground">Maridaas</span>
            </div>
            <nav className="flex items-center gap-4 text-sm text-muted-foreground" aria-label="Links do rodapé">
              <Link to="/termos" className="hover:text-primary transition-colors">Termos de Uso</Link>
              <Link to="/privacidade" className="hover:text-primary transition-colors">Privacidade</Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Maridaas. Conectando comunidades.
            </p>
          </div>
        </div>
      </footer>

      <StickyMobileCta onOpenSignup={() => openSignup()} />

      {/* Modal de cadastro rápido: continua o fluxo sem sair da página */}
      <Dialog open={signupOpen} onOpenChange={setSignupOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Criar conta grátis na Maridaas</DialogTitle>
          <SignupFlow
            initialEmail={signupEmail}
            skipSocialScreen={!!signupEmail}
            onSuccess={() => setSignupOpen(false)}
            onRequestLogin={() => {
              setSignupOpen(false);
              navigate("/auth");
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "primary" | "secondary" | "accent";
}

const FeatureCard = ({ icon, title, description, color }: FeatureCardProps) => {
  const colorClasses = {
    primary: "bg-teal-light text-primary",
    secondary: "bg-gold-light text-secondary",
    accent: "bg-salmon-light text-accent-foreground",
  };

  return (
    <article className="card-maridaas text-center">
      <div className={`w-16 h-16 rounded-2xl ${colorClasses[color]} flex items-center justify-center mx-auto mb-6`}>
        {icon}
      </div>
      <h3 className="text-xl font-display font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </article>
  );
};

export default Landing;
