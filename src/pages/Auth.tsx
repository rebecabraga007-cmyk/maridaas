import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/safeClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft, Loader2, Mail } from "lucide-react";
import { z } from "zod";
import SignupFlow from "@/components/auth/SignupFlow";
import { GoogleIcon, AppleIcon, getIsApplePlatform, useOAuth } from "@/components/auth/oauth";
import Logo from "@/components/Logo";
import InAppBrowserNotice from "@/components/auth/InAppBrowserNotice";
import { isInAppBrowser } from "@/lib/browserEnv";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { oauthLoading, handleOAuth } = useOAuth();
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const isApple = getIsApplePlatform();
  // Google recusa OAuth em WebView de app (Instagram etc.) — ver src/lib/browserEnv.ts
  const inApp = isInAppBrowser();

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

  // Render login: social buttons (compartilhados com o cadastro) + entrada por email
  const renderSocialLogin = () => {
    const socialButtons = [
      { key: "google" as const, icon: <GoogleIcon />, label: "Continuar com Google", className: "" },
      { key: "apple" as const, icon: <AppleIcon />, label: "Continuar com Apple", className: "bg-black text-white hover:bg-black/90 hover:text-white" },
    ];
    if (isApple) socialButtons.reverse();

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">Entrar</h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha como acessar</p>
        </div>

        <div className="space-y-3">
          {socialButtons.map((btn) => (
            <Button
              key={btn.key}
              variant="outline"
              className={`w-full h-12 text-base font-medium gap-3 border-border ${btn.className}`}
              onClick={() => handleOAuth(btn.key)}
              disabled={oauthLoading !== null}
              aria-label={btn.label}
            >
              {oauthLoading === btn.key ? <Loader2 className="h-5 w-5 animate-spin" /> : btn.icon}
              {btn.label}
            </Button>
          ))}
        </div>

        {inApp && <InAppBrowserNotice />}

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

        <p className="text-center text-sm text-muted-foreground mt-4">
          Não tem conta?{" "}
          <button onClick={() => { setIsSignup(true); setShowEmailForm(false); }} className="text-primary hover:underline font-medium">
            Criar conta
          </button>
        </p>
      </div>
    );
  };

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
      <Button type="submit" className="w-full btn-maridaas h-12" disabled={loading}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
      </Button>
    </form>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="text-center text-primary-foreground">
          <Logo variant="favicon" size={128} alt="Maridaas" className="h-32 w-32 mx-auto mb-8 animate-float" priority />
          <h1 className="text-4xl font-display font-bold mb-4">Maridaas</h1>
          <p className="text-xl opacity-90">Sua comunidade de bairro</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <Logo variant="favicon" size={80} alt="Maridaas" className="h-20 w-20 mx-auto mb-4" priority />
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
                <Button type="submit" className="w-full btn-maridaas h-12" disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar link de recuperação"}
                </Button>
              </form>
            ) : isSignup ? (
              <SignupFlow onRequestLogin={() => setIsSignup(false)} />
            ) : !showEmailForm ? (
              renderSocialLogin()
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
