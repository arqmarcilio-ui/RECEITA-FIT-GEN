
import React from 'react';
import { Language, translations } from '../translations';
import { ChefHat, Heart, History, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onStart: () => void;
  onOpenFavorites: () => void;
  onOpenHistory: () => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onStart, 
  onOpenFavorites, 
  onOpenHistory,
  language,
  onLanguageChange
}) => {
  const t = translations[language];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center bg-white relative overflow-hidden">
      {/* Language Selector */}
      <div className="absolute top-12 left-0 right-0 z-50 flex justify-center gap-2">
        {(['pt', 'en'] as const).map((lang) => (
          <button 
            key={lang}
            onClick={() => onLanguageChange(lang)}
            className={`px-6 py-2 rounded-full font-black text-[10px] tracking-widest uppercase transition-all ${
              language === lang 
                ? 'bg-emerald-500 text-white shadow-lg' 
                : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
        <div className="space-y-4 mb-20">
          <h1 className="text-6xl font-black text-slate-900 leading-none tracking-tighter uppercase">
            RECEITA<br/>
            <span className="text-emerald-500">FIT GEN</span>
          </h1>
          <p className="text-slate-400 text-xs font-black uppercase tracking-[0.4em]">
            {t.appSubtitle}
          </p>
        </div>

        <div className="w-full space-y-6">
          <button 
            onClick={onStart}
            className="w-full py-6 bg-emerald-500 text-white rounded-3xl font-black text-2xl uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
          >
            {t.start}
          </button>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={onOpenFavorites}
              className="flex items-center justify-center gap-2 py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              <Heart className="w-4 h-4 text-rose-500" />
              {t.favorites}
            </button>
            <button 
              onClick={onOpenHistory}
              className="flex items-center justify-center gap-2 py-5 bg-white border-2 border-slate-100 text-slate-900 rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              <History className="w-4 h-4 text-emerald-500" />
              {t.history}
            </button>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        <div className="text-slate-300 text-[9px] font-black uppercase tracking-[0.4em]">
          {t.poweredBy}
        </div>
        <div className="px-4 py-1.5 bg-slate-50 text-slate-400 text-[8px] font-black tracking-widest uppercase rounded-full">
          {t.version} 2.1
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
