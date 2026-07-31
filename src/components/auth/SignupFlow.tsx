import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/safeClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, ArrowLeft, Loader2, Mail, Gift } from "lucide-react";
import { z } from "zod";
import { GoogleIcon, AppleIcon, getIsApplePlatform, useOAuth } from "@/components/auth/oauth";

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

export interface SignupFlowProps {
  /** Email já capturado antes do modal abrir (ex.: campo rápido do Hero). */
  initialEmail?: string;
  /** Se true, pula a tela social e vai direto para o formulário de email. */
  skipSocialScreen?: boolean;
  /** Chamado após supabase.auth.signUp() retornar sem erro. */
  onSuccess?: () => void;
  /** Link para tela de login (ex.: navegar para /auth). Se omitido, o link não aparece. */
  onRequestLogin?: () => void;
}

/**
 * Fluxo de cadastro (social + email em 2 etapas) compartilhado entre
 * a página /auth e o modal de cadastro rápido da Landing.
 */
const SignupFlow = ({ initialEmail = "", skipSocialScreen = false, onSuccess, onRequestLogin }: SignupFlowProps) => {
  const { toast } = useToast();

  const [showEmailForm, setShowEmailForm] = useState(skipSocialScreen);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { oauthLoading, handleOAuth } = useOAuth();
  const [step, setStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cep, setCep] = useState("");
  const [city, setCity] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [address, setAddress] = useState("");

  const isApple = useMemo(() => getIsApplePlatform(), []);

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
        onSuccess?.();
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ title: "Dados inválidos", description: error.errors[0].message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

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

  if (!showEmailForm) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-display font-bold text-foreground">Criar conta</h2>
          <p className="text-sm text-muted-foreground mt-1">Escolha como criar sua conta</p>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
          <div className="flex items-start gap-2">
            <Gift className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <p>
              Parabéns! Na promoção de inauguração, sua conta ganha 2 meses grátis. O acesso é gratuito apenas nos primeiros 60 dias.
            </p>
          </div>
        </div>

        <div className="space-y-3">{socialButtons}</div>

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

        {onRequestLogin && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            Já tem conta?{" "}
            <button onClick={onRequestLogin} className="text-primary hover:underline font-medium">
              Entrar
            </button>
          </p>
        )}
      </div>
    );
  }

  return step === 1 ? (
    <form onSubmit={handleSignupStep1} className="space-y-4">
      <div className="flex items-center gap-4 mb-6">
        {!skipSocialScreen && (
          <button type="button" onClick={() => setShowEmailForm(false)} className="text-muted-foreground" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">Dados da conta</h2>
          <p className="text-sm text-muted-foreground">Etapa 1 de 2</p>
        </div>
      </div>
      <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-foreground">
        <div className="flex items-start gap-2">
          <Gift className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <p>Promoção de inauguração: ao criar sua conta, você ganha 60 dias grátis para conhecer o Maridaas.</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="fullName">Nome completo</Label>
        <Input id="fullName" placeholder="Maria Silva" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-maridaas" autoComplete="name" autoFocus={!!initialEmail} />
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
      <Button type="submit" className="w-full btn-maridaas h-12">Continuar</Button>
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
          <p>Ao finalizar, você ativa 2 meses grátis. É gratuito somente nos primeiros 60 dias da promoção de inauguração.</p>
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
      <Button type="submit" className="w-full btn-maridaas h-12" disabled={loading || !acceptedTerms}>
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar minha conta"}
      </Button>
    </form>
  );
};

export default SignupFlow;
