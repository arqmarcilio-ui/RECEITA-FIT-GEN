import React from 'react';
import { Shield, ArrowLeft, Lock, Database, Bot, UserCheck, FileText, Mail, Trash2, Baby, Image } from 'lucide-react';

interface PrivacyPolicyProps {
  onBack?: () => void;
  contactEmail?: string;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onBack, contactEmail }) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  };

  const emailDisplay = contactEmail || 'receitafitgen@gmail.com';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-emerald-100">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 sm:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-md shadow-emerald-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                Receita <span className="text-emerald-500">Fit Gen</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Política de Privacidade
              </p>
            </div>
          </div>
          
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full font-black text-xs uppercase tracking-widest transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-8 space-y-8">
        {/* Intro Banner */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mb-3">
            POLÍTICA DE PRIVACIDADE
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            Esta Política de Privacidade descreve como o aplicativo <strong>Receita Fit Gen</strong> coleta, utiliza, armazena e protege as informações dos usuários. Ao utilizar o aplicativo, você concorda com as práticas descritas neste documento.
          </p>
        </div>

        {/* 1. Identificação e Finalidade */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <FileText className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              1. Identificação e Finalidade do Aplicativo
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            O <strong>Receita Fit Gen</strong> é um aplicativo desenvolvido para a geração de receitas culinárias saudáveis e sugestões alimentares personalizadas com o uso de tecnologia de inteligência artificial.
          </p>
        </section>

        {/* 2. Dados Coletados */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <Database className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              2. Dados Coletados
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Para garantir o funcionamento correto e a personalização dos serviços, o aplicativo pode coletar e processar os seguintes dados:
          </p>
          <ul className="list-disc list-inside text-slate-600 text-sm space-y-2 pl-2">
            <li><strong>Nome do usuário:</strong> fornecido durante a autenticação via Google.</li>
            <li><strong>Endereço de e-mail:</strong> utilizado para identificação e autenticação de acesso.</li>
            <li><strong>Identificador de usuário (UID):</strong> gerado pelo sistema de autenticação para associar a conta aos dados do app.</li>
            <li><strong>Dados necessários para autenticação:</strong> credenciais de acesso seguro gerenciadas via Firebase Authentication.</li>
            <li><strong>Preferências e informações fornecidas pelo próprio usuário:</strong> restrições dietéticas, tipo de refeição, ingredientes disponíveis, nível de habilidade e preferências alimentares informadas para geração de receitas.</li>
            <li><strong>Receitas geradas e dados associados:</strong> histórico de receitas criadas e armazenadas quando salvas pelo app.</li>
            <li><strong>Informações técnicas mínimas necessárias:</strong> logs técnicos de conexão e estado do dispositivo estritamente necessários para a segurança, prevenção de falhas e funcionamento estável do serviço.</li>
          </ul>
        </section>

        {/* 3. Autenticação e Firebase */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <UserCheck className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              3. Autenticação e Serviços Firebase
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            O aplicativo utiliza autenticação Google por meio do <strong>Firebase Authentication</strong> (fornecido pela Google LLC).
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            O Firebase/Google pode processar dados necessários para:
          </p>
          <ul className="list-disc list-inside text-slate-600 text-sm space-y-1 pl-2">
            <li>Autenticação de identidade;</li>
            <li>Controle de acesso aos recursos do aplicativo;</li>
            <li>Armazenamento de dados do aplicativo (Firestore);</li>
            <li>Segurança e funcionamento contínuo do serviço.</li>
          </ul>
        </section>

        {/* 4. Uso de Inteligência Artificial e Imagens */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <Bot className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              4. Processamento por Inteligência Artificial e Geração de Conteúdo
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            As informações fornecidas pelo usuário para geração de receitas são processadas por serviços de inteligência artificial utilizados pelo app, incluindo o <strong>Google Gemini</strong>, exclusivamente para gerar o conteúdo textual solicitado (receita, ingredientes, modo de preparo e informações nutricionais).
          </p>
          <div className="flex items-start gap-3 bg-slate-50 border border-slate-200/60 rounded-2xl p-4 mt-2">
            <Image className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <p className="text-slate-600 text-sm leading-relaxed">
              <strong>Geração de Imagens:</strong> A geração de ilustrações das receitas utiliza o serviço de inteligência artificial da <strong>OpenAI</strong> integrado à rota server-side do aplicativo, exclusivamente para criar imagens alinhadas aos pratos gerados.
            </p>
          </div>
        </section>

        {/* 5. Compartilhamento de Dados */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <Lock className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              5. Compartilhamento e Fornecedores Essenciais
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Os dados pessoais dos usuários <strong>não são vendidos</strong> sob nenhuma hipótese.
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            Os dados podem ser processados por fornecedores essenciais à operação do serviço, especificamente:
          </p>
          <ul className="list-disc list-inside text-slate-600 text-sm space-y-1 pl-2">
            <li><strong>Google / Firebase:</strong> autenticação, controle de acesso e armazenamento de banco de dados;</li>
            <li><strong>Google Gemini:</strong> geração textual de receitas alimentares;</li>
            <li><strong>OpenAI:</strong> geração de imagens ilustrativas de receitas;</li>
            <li><strong>Vercel Inc.:</strong> infraestrutura de hospedagem e execução das rotas server-side do aplicativo.</li>
          </ul>
        </section>

        {/* 6. Segurança e Retenção */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <Shield className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              6. Segurança e Retenção dos Dados
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            São utilizadas medidas técnicas razoáveis de segurança, incluindo autenticação e regras de acesso a banco de dados para proteger as informações dos usuários.
          </p>
          <p className="text-slate-600 text-sm leading-relaxed">
            Os dados são mantidos somente enquanto necessários para o funcionamento do serviço ou cumprimento de obrigações aplicáveis. Alguns dados poderão ser mantidos pelo período necessário para cumprimento de obrigações legais, regulatórias, de segurança ou prevenção a fraudes, quando aplicável.
          </p>
        </section>

        {/* 7. Exclusão de Conta e Direitos (LGPD) */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <Trash2 className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              7. Exclusão de Conta, Dados e Direitos do Usuário (LGPD)
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Em conformidade com a LGPD, o usuário pode solicitar informações, correção ou exclusão de seus dados pessoais.
          </p>
          
          <div className="bg-emerald-50/70 border border-emerald-100 rounded-2xl p-5 space-y-3">
            <h4 className="font-black text-emerald-950 text-sm uppercase tracking-wide">
              Solicitação de Exclusão de Conta e Dados
            </h4>
            <p className="text-slate-700 text-xs leading-relaxed">
              Disponibilizamos uma página exclusiva e pública com as instruções detalhadas para exclusão de conta e remoção de dados pessoais.
            </p>
            <a 
              href="/excluir-conta" 
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-md transition-all active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
              <span>Acessar Página de Exclusão de Conta</span>
            </a>
          </div>
        </section>

        {/* 8. Crianças */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <Baby className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              8. Informações sobre Crianças
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            O serviço não é especificamente destinado a crianças. Não coletamos intencionalmente dados pessoais de menores sem o consentimento dos pais ou responsáveis legais.
          </p>
        </section>

        {/* 9. Contato */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <Mail className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              9. Contato
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Para dúvidas ou esclarecimentos sobre esta Política de Privacidade, entre em contato através do e-mail:
          </p>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center">
            <a href={`mailto:${emailDisplay}`} className="text-slate-900 hover:text-emerald-600 font-mono text-sm font-bold transition-colors">
              {emailDisplay}
            </a>
          </div>
        </section>

        {/* Rodapé / Data */}
        <footer className="text-center py-6 border-t border-slate-200 text-slate-400 text-xs font-semibold space-y-2">
          <p>Receita Fit Gen &copy; 2026 - Todos os direitos reservados.</p>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[11px]">
            Última atualização: outubro de 2026
          </p>
        </footer>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
