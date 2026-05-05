import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft, Loader2, Mail, Gift } from "lucide-react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  fullName: z.string().min(3, "Nome completo é obrigatório"),
  cpf: z.string().regex(/^\d{11}$/, "CPF deve ter 11 dígitos"),
  birthDate: z.string().min(1, "Data de nascimento é obrigatória"),
  cep: z.string().regex(/^\d{8}$/, "CEP deve ter 8 dígitos"),
  city: z.string().min(2, "Cidade é obrigatória"),
  neighborhood: z.string().min(2, "Bairro é obrigatório"),
  address: z.string().min(5, "Endereço completo é obrigatório"),
});

// Platform detection
const getIsApplePlatform = () => {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod|Macintosh/.test(ua) && ("ontouchend" in document || /Safari/.test(ua));
};

// Google SVG icon
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Apple SVG icon
const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" className="shrink-0">
    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
  </svg>
);

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [step, setStep] = useState(1);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cep, setCep] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");

  const isApple = useMemo(() => getIsApplePlatform(), []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/feed");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/feed");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      const { error } = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({
          title: "Erro ao entrar",
          description: error.message || `Falha ao iniciar login com ${provider === "google" ? "Google" : "Apple"}.`,
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro de conexão",
        description: "Não foi possível conectar ao provedor de login. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setOauthLoading(null);
    }
  };

  const formatCPF = (value: string) => value.replace(/\D/g, "").slice(0, 11);
  const formatCEP = (value: string) => value.replace(/\D/g, "").slice(0, 8);

  const fetchAddressByCEP = async (cepValue: string) => {
    if (cepValue.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cepValue}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setCity(data.localidade || "");
          setNeighborhood(data.bairro || "");
          setAddress(data.logradouro || "");
        }
      } catch {
        // Silently fail
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      loginSchema.parse({ email, password });
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast({ title: "Email não confirmado", description: "Verifique sua caixa de entrada.", variant: "destructive" });
        } else if (error.message.includes("Invalid login credentials")) {
          toast({ title: "Erro ao entrar", description: "Email ou senha incorretos.", variant: "destructive" });
        } else {
          toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Dados inválidos", description: error.errors[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) {
      toast({ title: "Informe seu email", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Email enviado!", description: "Verifique sua caixa de entrada para redefinir sua senha." });
      setShowResetPassword(false);
      setResetEmail("");
    }
    setResetLoading(false);
  };

  const handleSignupStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      z.object({
        email: z.string().email("Email inválido"),
        password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
        fullName: z.string().min(3, "Nome completo é obrigatório"),
      }).parse({ email, password, fullName });
      setStep(2);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Dados inválidos", description: error.errors[0].message, variant: "destructive" });
      }
    }
  };

  const handleSignupStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast({ title: "Termos obrigatórios", description: "Você precisa aceitar os termos de uso e política de privacidade.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      signupSchema.parse({ email, password, fullName, cpf, birthDate, cep, city, neighborhood, address });
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName, cpf, birth_date: birthDate, cep, city, neighborhood, address },
        },
      });
      if (error) {
        if (error.message.includes("already registered")) {
          toast({ title: "Email já cadastrado", description: "Este email já está em uso. Tente fazer login.", variant: "destructive" });
        } else {
          toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
        }
      } else {
        toast({
          title: "Parabéns! Você acaba de ganhar 2 meses grátis",
          description: "Promoção de inauguração: os primeiros 60 dias são gratuitos para conhecer a plataforma.",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Dados inválidos", description: error.errors[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  // Social buttons ordered by platform
  const socialButtons = useMemo(() => {
    const google = (
      <Button
        key="google"
        variant="outline"
        className="w-full h-12 text-base font-medium gap-3 border-border"
        onClick={() => handleOAuth("google")}
        disabled={oauthLoading !== null}
        aria-label="Continuar com Google"
      >
        {oauthLoading === "google" ? <Loader2 className="h-5 w-5 animate-spin" /> : <GoogleIcon />}
        Continuar com Google
      </Button>
    );
    const apple = (
      <Button
        key="apple"
        variant="outline"
        className="w-full h-12 text-base font-medium gap-3 border-border bg-black text-white hover:bg-black/90 hover:text-white"
        onClick={() => handleOAuth("apple")}
        disabled={oauthLoading !== null}
        aria-label="Continuar com Apple"
      >
        {oauthLoading === "apple" ? <Loader2 className="h-5 w-5 animate-spin" /> : <AppleIcon />}
        Continuar com Apple
      </Button>
    );
    return isApple ? [apple, google] : [google, apple];
  }, [isApple, oauthLoading]);

  // Render social login view (default)
  const renderSocialLogin = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-xl font-display font-bold text-foreground">
          {isSignup ? "Criar conta" : "Entrar"}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isSignup ? "Escolha como criar sua conta" : "Escolha como acessar"}
        </p>
      </div>

      {isSignup && (
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
          <div className="flex items-start gap-2">
            <Gift className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p>
              Parabéns! Na promoção de inauguração, sua conta ganha 2 meses grátis. O acesso é gratuito apenas nos primeiros 60 dias.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {socialButtons}
      </div>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full h-12 text-base font-medium gap-3 border-border"
        onClick={() => setShowEmailForm(true)}
        aria-label="Continuar com email"
      >
        <Mail className="h-5 w-5" />
        Continuar com Email
      </Button>

      {/* Toggle login/signup */}
      <p className="text-center text-sm text-muted-foreground mt-4">
        {isSignup ? (
          <>Já tem conta?{" "}
            <button onClick={() => { setIsSignup(false); setShowEmailForm(false); }} className="text-primary hover:underline font-medium">
              Entrar
            </button>
          </>
        ) : (
          <>Não tem conta?{" "}
            <button onClick={() => { setIsSignup(true); setShowEmailForm(false); }} className="text-primary hover:underline font-medium">
              Criar conta
            </button>
          </>
        )}
      </p>
    </div>
  );

  // Render email login form
  const renderEmailLogin = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={() => setShowEmailForm(false)} className="text-muted-foreground" aria-label="Voltar">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Entrar com email</h2>
          <p className="text-sm text-muted-foreground">Use seu email e senha</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input-maridaas" autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="input-maridaas pr-10" autoComplete="current-password" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </div>
      <button type="button" onClick={() => { setShowResetPassword(true); setResetEmail(email); }} className="text-sm text-primary hover:underline">
        Esqueceu a senha?
      </button>
      <Button type="submit" className="w-full btn-maridaas" disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
      </Button>
    </form>
  );

  // Render email signup form
  const renderEmailSignup = () => (
    <>
      {step === 1 ? (
        <form onSubmit={handleSignupStep1} className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <button type="button" onClick={() => setShowEmailForm(false)} className="text-muted-foreground" aria-label="Voltar">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Dados da conta</h2>
              <p className="text-sm text-muted-foreground">Etapa 1 de 2</p>
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
            <div className="flex items-start gap-2">
              <Gift className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <p>
                Promoção de inauguração: ao criar sua conta, você ganha 60 dias grátis para conhecer o Maridaas.
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo</Label>
            <Input id="fullName" placeholder="Maria Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-maridaas" autoComplete="name" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signupEmail">Email</Label>
            <Input id="signupEmail" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} className="input-maridaas" autoComplete="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signupPassword">Senha</Label>
            <div className="relative">
              <Input id="signupPassword" type={showPassword ? "text" : "password"} placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} className="input-maridaas pr-10" autoComplete="new-password" />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full btn-maridaas">Continuar</Button>
        </form>
      ) : (
        <form onSubmit={handleSignupStep2} className="space-y-4">
          <div className="flex items-center gap-4 mb-6">
            <button type="button" onClick={() => setStep(1)} className="text-muted-foreground" aria-label="Voltar à etapa 1">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-xl font-display font-bold text-foreground">Seus dados</h2>
              <p className="text-sm text-muted-foreground">Etapa 2 de 2</p>
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
            <div className="flex items-start gap-2">
              <Gift className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              <p>
                Ao finalizar, você ativa 2 meses grátis. É gratuito somente nos primeiros 60 dias da promoção de inauguração.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" placeholder="00000000000" value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} className="input-maridaas" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="birthDate">Nascimento</Label>
              <Input id="birthDate" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="input-maridaas" autoComplete="bday" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cep">CEP</Label>
            <Input id="cep" placeholder="00000000" value={cep} onChange={(e) => { const v = formatCEP(e.target.value); setCep(v); fetchAddressByCEP(v); }} className="input-maridaas" autoComplete="postal-code" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">Cidade</Label>
              <Input id="city" placeholder="São Paulo" value={city} onChange={(e) => setCity(e.target.value)} className="input-maridaas" autoComplete="address-level2" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="neighborhood">Bairro</Label>
              <Input id="neighborhood" placeholder="Centro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} className="input-maridaas" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Endereço completo</Label>
            <Input id="address" placeholder="Rua, número, complemento" value={address} onChange={(e) => setAddress(e.target.value)} className="input-maridaas" autoComplete="street-address" />
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
            <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(checked) => setAcceptedTerms(checked === true)} className="mt-0.5" />
            <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              Eu li e concordo com os{" "}
              <a href="/termos" target="_blank" className="text-primary underline">Termos de Uso</a>{" "}e a{" "}
              <a href="/privacidade" target="_blank" className="text-primary underline">Política de Privacidade</a>.
              Autorizo o tratamento dos meus dados pessoais conforme descrito.
            </label>
          </div>
          <Button type="submit" className="w-full btn-maridaas" disabled={loading || !acceptedTerms}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar minha conta"}
          </Button>
        </form>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="text-center text-primary-foreground">
          <img src="/favicon.png" alt="Maridaas" className="h-32 w-32 mx-auto mb-8 animate-float" />
          <h1 className="text-4xl font-display font-bold mb-4">Maridaas</h1>
          <p className="text-xl opacity-90">Sua comunidade de bairro</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/favicon.png" alt="Maridaas" className="h-20 w-20 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground">Maridaas</h1>
          </div>

          <div className="card-maridaas p-8">
            {showResetPassword ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <button type="button" onClick={() => setShowResetPassword(false)} className="text-muted-foreground" aria-label="Voltar">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-display font-bold text-foreground">Recuperar senha</h2>
                    <p className="text-sm text-muted-foreground">Enviaremos um link para seu email</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input id="resetEmail" type="email" placeholder="seu@email.com" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="input-maridaas" autoComplete="email" />
                </div>
                <Button type="submit" className="w-full btn-maridaas" disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar link de recuperação"}
                </Button>
              </form>
            ) : !showEmailForm ? (
              renderSocialLogin()
            ) : isSignup ? (
              renderEmailSignup()
            ) : (
              renderEmailLogin()
            )}
          </div>

          <p className="text-center text-sm text-muted-foreground mt-6">
            <a href="/" className="hover:text-primary transition-colors">← Voltar para o início</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
