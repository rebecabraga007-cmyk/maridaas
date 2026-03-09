import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Crown, Check, Loader2, ArrowLeft, Settings, Star } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SEOHead from "@/components/SEOHead";

const Premium = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        checkSubscription();
      } else {
        setChecking(false);
      }
    };
    getUser();
  }, []);

  // Check for success/canceled query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      toast({ title: "Pagamento realizado!", description: "Sua assinatura premium está ativa." });
      checkSubscription();
      window.history.replaceState({}, "", "/premium");
    }
    if (params.get("canceled") === "true") {
      toast({ title: "Pagamento cancelado", description: "Você pode tentar novamente quando quiser.", variant: "destructive" });
      window.history.replaceState({}, "", "/premium");
    }
  }, []);

  const checkSubscription = async () => {
    try {
      setChecking(true);
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscribed(data.subscribed);
      setSubscriptionEnd(data.subscription_end);
    } catch {
      toast({
        title: "Erro",
        description: "Não foi possível verificar sua assinatura agora.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível iniciar o checkout.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível abrir o portal.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    "Destaque nos serviços oferecidos",
    "Selo premium no perfil",
    "Prioridade no suporte",
    "Acesso antecipado a novidades",
    "Sem anúncios",
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 glass border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-foreground">Premium</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        {/* Hero */}
        <div className="text-center space-y-3 py-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center">
            <Crown className="h-8 w-8 text-secondary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Maridaas Premium</h2>
          <p className="text-muted-foreground">
            Aproveite ao máximo a sua experiência na comunidade
          </p>
        </div>

        {/* Status */}
        {checking ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : subscribed ? (
          <Card className="p-5 border-2 border-secondary bg-secondary/5">
            <div className="flex items-center gap-3 mb-3">
              <Star className="h-5 w-5 text-secondary fill-secondary" />
              <span className="font-bold text-foreground">Assinatura Ativa</span>
            </div>
            {subscriptionEnd && (
              <p className="text-sm text-muted-foreground mb-4">
                Próxima renovação: {new Date(subscriptionEnd).toLocaleDateString("pt-BR")}
              </p>
            )}
            <Button
              onClick={handleManageSubscription}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
              Gerenciar Assinatura
            </Button>
          </Card>
        ) : null}

        {/* Plan Card */}
        {!subscribed && !checking && (
          <Card className="p-6 border-2 border-accent/30 shadow-elevated">
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-foreground">
                R$ 29,90
                <span className="text-base font-normal text-muted-foreground">/mês</span>
              </div>
            </div>

            <ul className="space-y-3 mb-6">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full btn-maridaas"
              size="lg"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Crown className="h-4 w-4" />
                  Assinar Premium
                </>
              )}
            </Button>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Premium;
