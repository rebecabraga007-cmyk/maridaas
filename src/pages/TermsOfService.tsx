import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Termos de Uso — Maridaas"
        description="Leia os termos de uso da Maridaas, a rede social de bairro que conecta vizinhas e fortalece comunidades."
        canonical="https://maridaas.lovable.app/termos"
      />

      <header className="sticky top-0 z-10 glass border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Termos de Uso</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 prose prose-sm text-foreground">
        <p className="text-muted-foreground text-sm">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <h2>1. Aceitação dos Termos</h2>
        <p>
          Ao criar uma conta na Maridaas, você concorda com estes Termos de Uso e com nossa
          Política de Privacidade. Caso não concorde, não utilize o serviço.
        </p>

        <h2>2. Descrição do Serviço</h2>
        <p>
          A Maridaas é uma rede social de bairro que permite a interação entre vizinhas,
          compartilhamento de serviços locais e comunicação comunitária.
        </p>

        <h2>3. Cadastro e Conta</h2>
        <p>
          Para se cadastrar, é necessário fornecer informações verdadeiras.
          O uso de dados falsos ou de terceiros pode resultar na suspensão da conta.
          Cada pessoa pode ter apenas uma conta.
        </p>

        <h2>4. Conduta do Usuário</h2>
        <p>Ao utilizar a Maridaas, você concorda em:</p>
        <ul>
          <li>Não publicar conteúdo ofensivo, discriminatório ou ilegal</li>
          <li>Não utilizar a plataforma para spam ou propaganda enganosa</li>
          <li>Respeitar a privacidade das demais usuárias</li>
          <li>Não tentar acessar dados de outras usuárias indevidamente</li>
        </ul>

        <h2>5. Serviços Premium</h2>
        <p>
          A assinatura Premium é cobrada mensalmente via Stripe. O cancelamento pode ser feito
          a qualquer momento e será efetivo ao final do período pago.
        </p>

        <h2>6. Propriedade Intelectual</h2>
        <p>
          Todo o conteúdo publicado pelas usuárias permanece de sua autoria.
          A Maridaas possui licença de uso para exibição dentro da plataforma.
        </p>

        <h2>7. Exclusão de Conta</h2>
        <p>
          Você pode solicitar a exclusão da sua conta a qualquer momento através do perfil.
          A exclusão é irreversível e remove todos os seus dados pessoais.
        </p>

        <h2>8. Limitação de Responsabilidade</h2>
        <p>
          A Maridaas não se responsabiliza por transações entre usuárias, qualidade de serviços
          anunciados ou conteúdo publicado por terceiros.
        </p>
      </main>
    </div>
  );
};

export default TermsOfService;
