import React from 'react';
import { Language, translations } from '../translations';
import { LogIn, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  language: Language;
  onLogin: () => void;
  error: string | null;
  isLoading: boolean;
  showInviteCode?: boolean;
  userEmail?: string | null;
  onVerifyCode?: (code: string) => void;
  onCancel?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ 
  language, 
  onLogin, 
  error, 
  isLoading,
  showInviteCode = false,
  userEmail = null,
  onVerifyCode,
  onCancel
}) => {
  const t = translations[language];
  const [code, setCode] = React.useState('');

  const handleSubmitCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim() && onVerifyCode) {
      onVerifyCode(code.trim());
    }
  };

  if (showInviteCode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white relative overflow-hidden">
        <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
          <div className="space-y-4 mb-10">
            <h1 className="text-4xl font-black text-slate-900 leading-none tracking-tighter uppercase">
              CÓDIGO DE<br/>
              <span className="text-emerald-500">CONVITE</span>
            </h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">
              Acesso Restrito
            </p>
          </div>

          <div className="w-full mb-6 bg-slate-50 border border-slate-100 p-5 rounded-3xl text-left shadow-sm">
            <p className="text-slate-600 text-xs font-medium leading-relaxed">
              O e-mail <strong className="text-slate-900">{userEmail}</strong> está autenticado, mas não possui permissão de acesso ativa.
            </p>
            <p className="text-slate-500 text-[10px] font-medium mt-2">
              Se você tem um código de convite único, insira-o abaixo para liberar seu uso.
            </p>
          </div>

          {error && (
            <div className="w-full mb-6 bg-rose-50 border border-rose-100 p-5 rounded-3xl flex flex-col items-center gap-2 shadow-sm animate-in fade-in slide-in-from-bottom-4">
              <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
              <p className="text-rose-900 font-black text-xs uppercase tracking-widest text-center">Erro de Validação</p>
              <p className="text-rose-700 text-[11px] font-medium text-center">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmitCode} className="w-full space-y-4">
            <input
              type="text"
              placeholder="Digite o código (ex: ABC123)"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              disabled={isLoading}
              className="w-full px-6 py-4 border-2 border-slate-100 focus:border-emerald-500 focus:outline-none rounded-2xl text-center font-black text-lg uppercase tracking-widest text-slate-800 transition-all bg-slate-50 focus:bg-white"
            />

            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className={`w-full py-5 flex items-center justify-center gap-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all ${
                isLoading || !code.trim()
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-3 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
              ) : (
                'Liberar Acesso'
              )}
            </button>
            
            {!isLoading && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-3 text-slate-400 hover:text-rose-500 font-black text-xs uppercase tracking-widest transition-all"
              >
                Voltar para Login
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white relative overflow-hidden">
      <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
        <div className="space-y-4 mb-16">
          <h1 className="text-6xl font-black text-slate-900 leading-none tracking-tighter uppercase">
            RECEITA<br/>
            <span className="text-emerald-500">FIT GEN</span>
          </h1>
          <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em]">
            {t.appSubtitle}
          </p>
        </div>

        {error && (
          <div className="w-full mb-8 bg-rose-50 border border-rose-100 p-5 rounded-3xl flex flex-col items-center gap-2 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
            <p className="text-rose-900 font-black text-sm uppercase tracking-widest text-center">{t.restrictedAccess}</p>
            <p className="text-rose-700 text-xs font-medium text-center">{error}</p>
          </div>
        )}

        <div className="w-full space-y-6">
          <p className="text-slate-500 text-sm font-medium mb-4">
            {isLoading ? t.verifyingAuth : t.loginToAccess}
          </p>
          
          <button 
            onClick={onLogin}
            disabled={isLoading}
            className={`w-full py-6 flex items-center justify-center gap-3 rounded-3xl font-black text-lg uppercase tracking-widest shadow-xl transition-all ${
              isLoading 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
            }`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-slate-300 border-t-slate-500 rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-6 h-6" />
                {t.signInWithGoogle}
              </>
            )}
          </button>
        </div>
      </div>
      
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        <div className="text-slate-300 text-[9px] font-black uppercase tracking-[0.4em]">
          {t.poweredBy}
        </div>
        <div className="px-4 py-1.5 bg-slate-50 text-slate-400 text-[8px] font-black tracking-widest uppercase rounded-full">
          {t.version} 2.0
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
