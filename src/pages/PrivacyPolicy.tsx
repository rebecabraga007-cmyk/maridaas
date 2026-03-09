import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Política de Privacidade — Maridaas"
        description="Saiba como a Maridaas coleta, usa e protege seus dados pessoais de acordo com a LGPD."
        canonical="https://maridaas.lovable.app/privacidade"
      />

      <header className="sticky top-0 z-10 glass border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Política de Privacidade</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 prose prose-sm text-foreground">
        <p className="text-muted-foreground text-sm">Última atualização: {new Date().toLocaleDateString("pt-BR")}</p>

        <h2>1. Dados Coletados</h2>
        <p>
          A Maridaas coleta os seguintes dados pessoais no cadastro: nome completo, CPF, data de nascimento,
          endereço (CEP, cidade, bairro, logradouro) e email. Opcionalmente, coletamos WhatsApp, Instagram, foto de perfil e bio.
        </p>

        <h2>2. Finalidade do Tratamento</h2>
        <p>
          Os dados são utilizados para: verificação de identidade e residência, vinculação ao bairro correto,
          exibição de perfil público limitado a vizinhas, e comunicação entre usuárias.
        </p>

        <h2>3. Base Legal (LGPD Art. 7º)</h2>
        <p>
          O tratamento é baseado no consentimento da titular (Art. 7º, I) coletado no momento do cadastro.
          Dados sensíveis como CPF são tratados com base em necessidade para execução do serviço.
        </p>

        <h2>4. Compartilhamento de Dados</h2>
        <p>
          Dados sensíveis (CPF, endereço, data de nascimento) nunca são compartilhados com outras usuárias.
          Apenas nome, bio, bairro e contatos opcionais (Instagram, WhatsApp) são visíveis para vizinhas do mesmo bairro.
        </p>

        <h2>5. Armazenamento e Segurança</h2>
        <p>
          Os dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso.
          Políticas de acesso baseadas em função (RLS) garantem que cada usuária acesse apenas seus próprios dados.
        </p>

        <h2>6. Direitos da Titular (LGPD Art. 18)</h2>
        <p>Você tem direito a:</p>
        <ul>
          <li>Confirmar a existência de tratamento dos seus dados</li>
          <li>Acessar seus dados pessoais</li>
          <li>Corrigir dados incompletos ou desatualizados</li>
          <li>Solicitar a eliminação dos seus dados (exclusão de conta)</li>
          <li>Revogar o consentimento a qualquer momento</li>
        </ul>
        <p>
          Para exercer seus direitos, acesse seu perfil e utilize a opção "Excluir minha conta"
          ou entre em contato conosco.
        </p>

        <h2>7. Retenção de Dados</h2>
        <p>
          Seus dados são mantidos enquanto sua conta estiver ativa. Ao solicitar exclusão,
          todos os dados pessoais serão removidos em até 30 dias.
        </p>

        <h2>8. Cookies e Dados de Navegação</h2>
        <p>
          Utilizamos apenas cookies essenciais para autenticação e funcionamento da sessão.
          Não utilizamos cookies de rastreamento ou publicidade.
        </p>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
