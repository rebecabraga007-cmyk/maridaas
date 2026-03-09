import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft, Loader2 } from "lucide-react";
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

const Auth = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isSignup, setIsSignup] = useState(searchParams.get("mode") === "signup");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

  const formatCPF = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 11);
  };

  const formatCEP = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 8);
  };

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
        // Silently fail - user can fill manually
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      loginSchema.parse({ email, password });

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Email not confirmed")) {
          toast({
            title: "Email não confirmado",
            description: "Verifique sua caixa de entrada e clique no link de confirmação enviado ao criar sua conta.",
            variant: "destructive",
          });
        } else if (error.message.includes("Invalid login credentials")) {
          toast({
            title: "Erro ao entrar",
            description: "Email ou senha incorretos.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao entrar",
            description: error.message,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Dados inválidos",
          description: error.errors[0].message,
          variant: "destructive",
        });
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
      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
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
        toast({
          title: "Dados inválidos",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    }
  };

  const handleSignupStep2 = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      toast({
        title: "Termos obrigatórios",
        description: "Você precisa aceitar os termos de uso e política de privacidade.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      signupSchema.parse({
        email,
        password,
        fullName,
        cpf,
        birthDate,
        cep,
        city,
        neighborhood,
        address,
      });

      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            cpf,
            birth_date: birthDate,
            cep,
            city,
            neighborhood,
            address,
          },
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          toast({
            title: "Email já cadastrado",
            description: "Este email já está em uso. Tente fazer login.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Erro ao criar conta",
            description: error.message,
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Conta criada!",
          description: "Verifique seu email para confirmar sua conta antes de fazer login.",
        });
        setIsSignup(false);
        setStep(1);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Dados inválidos",
          description: error.errors[0].message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-primary items-center justify-center p-12">
        <div className="text-center text-primary-foreground">
          <img src="/logo.png" alt="Maridaas" className="h-32 w-32 mx-auto mb-8 animate-float" />
          <h1 className="text-4xl font-display font-bold mb-4">Maridaas</h1>
          <p className="text-xl opacity-90">Sua comunidade de bairro</p>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/logo.png" alt="Maridaas" className="h-20 w-20 mx-auto mb-4" />
            <h1 className="text-2xl font-display font-bold text-foreground">Maridaas</h1>
          </div>

          <div className="card-maridaas p-8">
            {showResetPassword ? (
              /* Reset Password Form */
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <button type="button" onClick={() => setShowResetPassword(false)} className="text-muted-foreground">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                  <div>
                    <h2 className="text-xl font-display font-bold text-foreground">Recuperar senha</h2>
                    <p className="text-sm text-muted-foreground">Enviaremos um link para seu email</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="resetEmail">Email</Label>
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="seu@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="input-maridaas"
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" className="w-full btn-maridaas" disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Enviar link de recuperação"}
                </Button>
              </form>
            ) : (
              <>
                {/* Toggle */}
                <div className="flex gap-2 p-1 bg-muted rounded-xl mb-8" role="tablist">
                  <button
                    role="tab"
                    aria-selected={!isSignup}
                    onClick={() => { setIsSignup(false); setStep(1); }}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      !isSignup ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Entrar
                  </button>
                  <button
                    role="tab"
                    aria-selected={isSignup}
                    onClick={() => setIsSignup(true)}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      isSignup ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    Criar conta
                  </button>
                </div>

                {!isSignup ? (
                  /* Login Form */
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-maridaas"
                        autoComplete="email"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Senha</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="input-maridaas pr-10"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setShowResetPassword(true); setResetEmail(email); }}
                      className="text-sm text-primary hover:underline"
                    >
                      Esqueceu a senha?
                    </button>

                    <Button type="submit" className="w-full btn-maridaas" disabled={loading}>
                      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar"}
                    </Button>
                  </form>
                ) : (
                  /* Signup Form */
                  <>
                    {step === 1 ? (
                      <form onSubmit={handleSignupStep1} className="space-y-4">
                        <div className="text-center mb-6">
                          <h2 className="text-xl font-display font-bold text-foreground">Dados da conta</h2>
                          <p className="text-sm text-muted-foreground">Etapa 1 de 2</p>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="fullName">Nome completo</Label>
                          <Input
                            id="fullName"
                            placeholder="Maria Silva"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="input-maridaas"
                            autoComplete="name"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signupEmail">Email</Label>
                          <Input
                            id="signupEmail"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-maridaas"
                            autoComplete="email"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="signupPassword">Senha</Label>
                          <div className="relative">
                            <Input
                              id="signupPassword"
                              type={showPassword ? "text" : "password"}
                              placeholder="Mínimo 6 caracteres"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              className="input-maridaas pr-10"
                              autoComplete="new-password"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                            >
                              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                          </div>
                        </div>

                        <Button type="submit" className="w-full btn-maridaas">
                          Continuar
                        </Button>
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

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cpf">CPF</Label>
                            <Input
                              id="cpf"
                              placeholder="00000000000"
                              value={cpf}
                              onChange={(e) => setCpf(formatCPF(e.target.value))}
                              className="input-maridaas"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="birthDate">Nascimento</Label>
                            <Input
                              id="birthDate"
                              type="date"
                              value={birthDate}
                              onChange={(e) => setBirthDate(e.target.value)}
                              className="input-maridaas"
                              autoComplete="bday"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="cep">CEP</Label>
                          <Input
                            id="cep"
                            placeholder="00000000"
                            value={cep}
                            onChange={(e) => {
                              const value = formatCEP(e.target.value);
                              setCep(value);
                              fetchAddressByCEP(value);
                            }}
                            className="input-maridaas"
                            autoComplete="postal-code"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="city">Cidade</Label>
                            <Input
                              id="city"
                              placeholder="São Paulo"
                              value={city}
                              onChange={(e) => setCity(e.target.value)}
                              className="input-maridaas"
                              autoComplete="address-level2"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="neighborhood">Bairro</Label>
                            <Input
                              id="neighborhood"
                              placeholder="Centro"
                              value={neighborhood}
                              onChange={(e) => setNeighborhood(e.target.value)}
                              className="input-maridaas"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="address">Endereço completo</Label>
                          <Input
                            id="address"
                            placeholder="Rua, número, complemento"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="input-maridaas"
                            autoComplete="street-address"
                          />
                        </div>

                        {/* LGPD Consent */}
                        <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/50">
                          <Checkbox
                            id="terms"
                            checked={acceptedTerms}
                            onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                            className="mt-0.5"
                          />
                          <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                            Eu li e concordo com os{" "}
                            <a href="/termos" target="_blank" className="text-primary underline">
                              Termos de Uso
                            </a>{" "}
                            e a{" "}
                            <a href="/privacidade" target="_blank" className="text-primary underline">
                              Política de Privacidade
                            </a>
                            . Autorizo o tratamento dos meus dados pessoais conforme descrito.
                          </label>
                        </div>

                        <Button type="submit" className="w-full btn-maridaas" disabled={loading || !acceptedTerms}>
                          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar minha conta"}
                        </Button>
                      </form>
                    )}
                  </>
                )}
              </>
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
