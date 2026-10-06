import React from 'react';
import { Trash2, ArrowLeft, Shield, Mail, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

interface AccountDeletionProps {
  onBack?: () => void;
  contactEmail?: string;
}

const AccountDeletion: React.FC<AccountDeletionProps> = ({ onBack, contactEmail }) => {
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      window.location.href = '/';
    }
  };

  const emailDisplay = contactEmail || 'receitafitgen@gmail.com';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-rose-100">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 sm:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center shadow-md shadow-rose-500/20">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                Receita <span className="text-emerald-500">Fit Gen</span>
              </h1>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Solicitação de Exclusão de Conta
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
            EXCLUSÃO DE CONTA E DADOS PESSOAIS
          </h2>
          <p className="text-slate-600 text-sm leading-relaxed">
            No <strong>Receita Fit Gen</strong>, respeitamos seu direito à privacidade e ao controle de seus dados pessoais. Se você deseja encerrar sua conta e remover seus dados de nossos servidores, siga as instruções contidas nesta página.
          </p>
        </div>

        {/* Como solicitar */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-rose-600">
            <Mail className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              Como solicitar a exclusão da sua conta
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            A solicitação de exclusão é realizada diretamente mediante envio de e-mail ao nosso suporte técnico:
          </p>
          
          <div className="bg-rose-50/70 border border-rose-100 rounded-2xl p-5 space-y-3">
            <p className="text-rose-950 font-bold text-xs uppercase tracking-wide">
              Passo a passo para envio da solicitação:
            </p>
            <ol className="list-decimal list-inside text-slate-700 text-xs space-y-2 pl-1">
              <li>Envie uma mensagem para o e-mail: <a href={`mailto:${emailDisplay}`} className="font-mono text-slate-900 underline hover:text-rose-600">{emailDisplay}</a></li>
              <li>Utilize o assunto: <strong className="text-slate-900">"Solicitação de Exclusão de Conta - Receita Fit Gen"</strong></li>
              <li>Envie o pedido a partir do <strong>mesmo endereço de e-mail cadastrado</strong> no aplicativo (para confirmação da identidade e titularidade da conta).</li>
            </ol>
            <p className="text-slate-500 text-[11px] font-medium pt-1">
              * O atendimento e a exclusão dos dados no banco de dados serão concluídos e confirmados por e-mail no prazo de até 15 dias úteis.
            </p>
          </div>
        </section>

        {/* Dados que serão excluídos */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              Quais dados serão permanentemente excluídos
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Após a validação da solicitação, os seguintes dados serão removidos dos nossos bancos de dados ativos:
          </p>
          <ul className="list-disc list-inside text-slate-600 text-sm space-y-2 pl-2">
            <li><strong>Cadastro de acesso:</strong> registro de autorização do e-mail no banco de dados (tabela <code>allowed_users</code>).</li>
            <li><strong>Vínculo de autenticação:</strong> associação do UID (identificador único) ao perfil do usuário.</li>
            <li><strong>Histórico de receitas privadas:</strong> histórico de receitas salvas e vinculadas à sua conta.</li>
            <li><strong>Códigos de convite vinculados:</strong> histórico de utilização de códigos de convite associados ao seu e-mail.</li>
          </ul>
        </section>

        {/* Retenção legal de dados */}
        <section className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-black uppercase tracking-wider text-slate-900">
              Retenção de Dados
            </h3>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Alguns dados poderão ser mantidos pelo período necessário para cumprimento de obrigações legais, regulatórias, de segurança ou prevenção a fraudes, quando aplicável.
          </p>
        </section>

        {/* Link para Política de Privacidade */}
        <section className="bg-slate-100 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Deseja consultar os detalhes completos de privacidade?</span>
          </div>
          <a
            href="/politica-de-privacidade"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
          >
            Ver Política de Privacidade
          </a>
        </section>

        {/* Rodapé */}
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

export default AccountDeletion;
