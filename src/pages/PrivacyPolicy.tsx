import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SEOHead from "@/components/SEOHead";

const PRIVACY_URL = "https://maridaas.lovable.app/privacidade";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Política de Privacidade — Maridaas"
        description="Saiba como a Maridaas coleta, usa e protege seus dados pessoais de acordo com a LGPD e o GDPR."
        canonical={PRIVACY_URL}
      />

      <header className="sticky top-0 z-10 glass border-b border-border px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold text-foreground">Política de Privacidade</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-6 prose prose-sm dark:prose-invert text-foreground">
        <p className="text-muted-foreground text-sm">
          Última atualização: {new Date().toLocaleDateString("pt-BR")}
          <br />
          URL oficial:{" "}
          <a href={PRIVACY_URL} className="text-primary underline">
            {PRIVACY_URL}
          </a>
        </p>

        <p>
          A sua privacidade é prioridade no Maridaas. Esta Política descreve como coletamos, usamos,
          armazenamos, compartilhamos e protegemos as informações dos usuários do aplicativo Maridaas
          ("Aplicativo", "Plataforma", "nós"). Ao criar uma conta ou utilizar o Maridaas, você declara
          ter lido e compreendido esta Política.
        </p>

        <h2>1. Sobre o Maridaas</h2>
        <p>
          O Maridaas é uma rede social e plataforma de comunidade local voltada a mulheres, com foco em
          conexão entre vizinhas, descoberta de serviços de confiança no bairro, troca de informações e
          fortalecimento de laços comunitários. Esta Política aplica-se a todas as funcionalidades
          disponibilizadas via App Store, Google Play e versão web.
        </p>

        <h2>2. Dados que coletamos</h2>
        <h3>2.1 Dados fornecidos por você</h3>
        <ul>
          <li><strong>Cadastrais:</strong> nome, e-mail, senha (armazenada com hash criptográfico) e, quando aplicável, telefone.</li>
          <li><strong>Perfil público:</strong> foto, biografia, vizinhança e informações que você opta por compartilhar.</li>
          <li><strong>Conteúdo gerado:</strong> publicações, comentários, fotos, mensagens, avaliações e serviços anunciados.</li>
          <li><strong>Verificação:</strong> dados sensíveis (CPF, endereço completo) são utilizados exclusivamente para confirmar identidade e <strong>nunca são exibidos publicamente</strong>.</li>
        </ul>

        <h3>2.2 Dados coletados automaticamente</h3>
        <ul>
          <li>Dados de uso (páginas visitadas, ações, tempo de sessão)</li>
          <li>Identificadores de dispositivo, modelo, sistema operacional e idioma</li>
          <li>Endereço IP, logs de acesso e dados técnicos</li>
          <li>Localização aproximada (vizinhança/região), nunca a localização exata em tempo real</li>
          <li>Cookies e tecnologias similares (ver Seção 7)</li>
        </ul>

        <h3>2.3 Dados de terceiros</h3>
        <ul>
          <li><strong>Login social:</strong> Google e Apple compartilham nome, e-mail e identificador único conforme autorizado por você.</li>
          <li><strong>Notificações push:</strong> identificadores gerenciados pelo OneSignal.</li>
        </ul>

        <h2>3. Como usamos suas informações</h2>
        <ul>
          <li>Operação do serviço (autenticação, conta, feed e mensagens)</li>
          <li>Personalização e recomendações locais</li>
          <li>Segurança, moderação e prevenção a fraudes</li>
          <li>Comunicação sobre interações, novidades e suporte</li>
          <li>Aprimoramento contínuo via análise agregada</li>
          <li>Cumprimento de obrigações legais e regulatórias</li>
        </ul>
        <p>Não vendemos dados pessoais a terceiros.</p>

        <h2>4. Compartilhamento de dados</h2>
        <ul>
          <li><strong>Infraestrutura e nuvem:</strong> Supabase (banco de dados, autenticação e storage)</li>
          <li><strong>Notificações:</strong> OneSignal</li>
          <li><strong>Pagamentos:</strong> Stripe</li>
          <li><strong>Analytics e monitoramento:</strong> ferramentas de performance, com pseudonimização sempre que possível</li>
          <li><strong>Obrigações legais:</strong> quando exigido por lei, ordem judicial ou autoridade competente</li>
        </ul>
        <p>Todos os parceiros estão sujeitos a obrigações contratuais de confidencialidade.</p>

        <h2>5. Armazenamento e segurança</h2>
        <ul>
          <li>Criptografia em trânsito (HTTPS/TLS) e em repouso quando aplicável</li>
          <li>Controle de acesso baseado em papéis (Row Level Security)</li>
          <li>Hash criptográfico de senhas</li>
          <li>Filtragem automática de dados sensíveis (CPF, endereço) em respostas de API</li>
          <li>Monitoramento contínuo, rate limiting e logs de auditoria</li>
        </ul>
        <p>
          Em caso de incidente de segurança relevante, comunicaremos os usuários e autoridades
          competentes conforme exigido pela LGPD e GDPR.
        </p>

        <h2>6. Seus direitos (LGPD e GDPR)</h2>
        <ul>
          <li>Acesso aos dados que mantemos sobre você</li>
          <li>Correção de dados incompletos ou desatualizados</li>
          <li>Exclusão da conta e dos dados associados (direito ao esquecimento)</li>
          <li>Portabilidade dos dados em formato estruturado</li>
          <li>Revogação do consentimento a qualquer momento</li>
          <li>Oposição e limitação do tratamento</li>
          <li>Reclamação à ANPD ou autoridade competente da União Europeia</li>
        </ul>
        <p>
          A exclusão pode ser feita em <strong>Perfil → Configurações → Excluir conta</strong> ou pelo
          e-mail de contato. A remoção é processada em cascata em todos os sistemas conectados.
        </p>

        <h2>7. Cookies e tecnologias similares</h2>
        <p>
          Utilizamos cookies e tecnologias equivalentes (local storage, identificadores de dispositivo)
          para manter sua sessão, lembrar preferências, medir desempenho e garantir segurança. Você pode
          gerenciá-los nas configurações do navegador ou sistema operacional.
        </p>

        <h2>8. Retenção de dados</h2>
        <p>
          Mantemos seus dados pelo tempo necessário para prestação do serviço, cumprimento de
          obrigações legais e exercício regular de direitos. Após a exclusão da conta, dados pessoais
          identificáveis são removidos ou anonimizados em prazo razoável.
        </p>

        <h2>9. Menores de idade</h2>
        <p>
          O Maridaas é destinado a maiores de 16 anos. Não coletamos intencionalmente dados de menores
          sem consentimento dos responsáveis. Cadastros irregulares serão removidos.
        </p>

        <h2>10. Transferência internacional de dados</h2>
        <p>
          Como utilizamos provedores globais, alguns dados podem ser processados fora do Brasil ou da
          União Europeia, sempre em conformidade com a LGPD e o GDPR, mediante cláusulas contratuais
          padrão e medidas de proteção equivalentes.
        </p>

        <h2>11. Alterações desta Política</h2>
        <p>
          Esta Política pode ser atualizada periodicamente. A versão mais recente estará sempre
          disponível em{" "}
          <a href={PRIVACY_URL} className="text-primary underline">
            {PRIVACY_URL}
          </a>
          . Alterações relevantes serão comunicadas no app ou por e-mail.
        </p>

        <h2>12. Contato</h2>
        <ul>
          <li>
            <strong>E-mail / Encarregado (DPO):</strong>{" "}
            <a href="mailto:privacidade@maridaas.com" className="text-primary underline">
              privacidade@maridaas.com
            </a>
          </li>
          <li>
            <strong>Website:</strong>{" "}
            <a href="https://maridaas.lovable.app" className="text-primary underline">
              https://maridaas.lovable.app
            </a>
          </li>
        </ul>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
