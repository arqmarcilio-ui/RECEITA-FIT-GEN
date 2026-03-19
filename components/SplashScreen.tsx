
import React from 'react';

interface SplashScreenProps {
  onStart: () => void;
  onOpenFavorites: () => void;
  onOpenHistory: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onStart, onOpenFavorites, onOpenHistory }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen p-8 text-center bg-white relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-[-10%] right-[-10%] w-80 h-80 bg-emerald-50 rounded-full blur-3xl opacity-60"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-80 h-80 bg-slate-100 rounded-full blur-3xl opacity-60"></div>
      
      <div className="space-y-12 w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center">
          {/* Nova Logo Moderna e Clean */}
          <div className="w-32 h-32 mb-8 p-7 bg-emerald-500 text-white rounded-[2.5rem] shadow-2xl shadow-emerald-100 rotate-12 flex items-center justify-center">
             <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
                {/* Chef Hat Base */}
                <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0 5.11 5.11 0 0 1 1.05 1.54 4 4 0 0 1 1.41 7.87" />
                <line x1="6" y1="17" x2="18" y2="17" />
                <path d="M6 17v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-2" />
                {/* Minimalist Leaf Detail */}
                <path d="M12 2c.5 1 1.5 1 2 2" stroke="white" strokeWidth="1.5" opacity="0.9" />
             </svg>
          </div>
          
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-[0.9]">
            RECEITA FIT<br/><span className="text-emerald-500">GEN</span>
          </h1>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mt-6 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
            Smart Nutrition AI
          </p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={onStart}
            className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-2xl transition-all shadow-2xl active:scale-95 uppercase tracking-tight"
          >
            Começar
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={onOpenFavorites}
              className="py-5 bg-white border-2 border-emerald-500 text-emerald-600 rounded-[1.8rem] font-black text-sm transition-all active:scale-95 uppercase"
            >
              Salvas
            </button>
            <button 
              onClick={onOpenHistory}
              className="py-5 bg-white border-2 border-slate-300 text-slate-700 rounded-[1.8rem] font-black text-sm transition-all active:scale-95 uppercase"
            >
              Histórico
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 flex flex-col items-center gap-1 text-slate-300 text-[10px] font-black uppercase tracking-widest">
        <div>Powered by Google Gemini 3</div>
        <div className="text-slate-500 font-bold">VERSÃO 1.2</div>
      </div>
    </div>
  );
};

export default SplashScreen;
