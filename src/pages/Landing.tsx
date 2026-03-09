import { Link } from "react-router-dom";
import { Users, MapPin, Heart, MessageCircle, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const Landing = () => {
  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Maridaas" className="h-10 w-10" />
            <span className="text-xl font-display font-bold text-foreground">Maridaas</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button size="sm" className="btn-maridaas">Criar conta</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-light text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Sua vizinhança mais conectada</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
              Conecte-se com sua{" "}
              <span className="text-primary">comunidade</span>{" "}
              de bairro
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Descubra serviços de confiança, faça novas amizades e fortaleça os laços 
              com suas vizinhas. Maridaas é a rede social que valoriza quem está perto de você.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="btn-maridaas text-lg px-8">
                  Começar agora
                </Button>
              </Link>
              <a href="#como-funciona" onClick={(e) => handleScrollTo(e, "como-funciona")}>
                <Button variant="outline" size="lg" className="text-lg px-8">
                  Como funciona
                </Button>
              </a>
            </div>
          </div>

          {/* Hero Illustration */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 gradient-hero opacity-10 rounded-3xl blur-3xl"></div>
            <div className="relative bg-card rounded-3xl shadow-elevated p-8 border border-border">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="card-maridaas p-4 animate-float" style={{ animationDelay: `${i * 0.2}s` }}>
                    <div className="avatar-maridaas mb-3 mx-auto">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="h-2 bg-muted rounded-full w-3/4 mx-auto mb-2"></div>
                    <div className="h-2 bg-muted rounded-full w-1/2 mx-auto"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="como-funciona" className="py-20 px-4 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
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
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="card-maridaas p-8 md:p-12 text-center gradient-primary text-primary-foreground">
            <ShieldCheck className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
              Segurança e Confiança
            </h2>
            <p className="text-lg opacity-90 max-w-2xl mx-auto mb-8">
              Verificamos a identidade de cada usuária. Você só interage com pessoas 
              que realmente moram no seu bairro.
            </p>
            <Link to="/auth?mode=signup">
              <Button variant="secondary" size="lg" className="text-primary font-semibold">
                Fazer parte da comunidade
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Maridaas" className="h-8 w-8" />
              <span className="font-display font-bold text-foreground">Maridaas</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href="/termos" className="hover:text-primary transition-colors">Termos de Uso</a>
              <a href="/privacidade" className="hover:text-primary transition-colors">Privacidade</a>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Maridaas. Conectando comunidades.
            </p>
          </div>
        </div>
      </footer>
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
    <div className="card-maridaas text-center">
      <div className={`w-16 h-16 rounded-2xl ${colorClasses[color]} flex items-center justify-center mx-auto mb-6`}>
        {icon}
      </div>
      <h3 className="text-xl font-display font-bold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
};

export default Landing;
