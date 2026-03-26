
import React, { useState, useEffect } from 'react';
import { Language, translations } from '../translations';

interface LoadingScreenProps {
  language: Language;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ language }) => {
  const t = translations[language];
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = t.loadingMessages;

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white p-12 space-y-16 animate-in fade-in duration-700">
      <div className="relative">
        <div className="w-40 h-40 border-[16px] border-slate-50 rounded-full"></div>
        <div className="absolute inset-0 w-40 h-40 border-[16px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center font-black text-emerald-500 text-sm tracking-widest">GEN</div>
      </div>
      <div className="text-center space-y-8 max-w-xs">
        <h2 className="text-5xl font-black text-slate-900 uppercase leading-none tracking-tighter">
          {t.loadingTitle}<br/><span className="text-emerald-500">{t.loadingSubtitle}</span>
        </h2>
        <div className="h-12 flex items-center justify-center">
          <p key={messageIndex} className="text-slate-400 font-bold italic text-xl animate-in fade-in slide-in-from-bottom-4 duration-700">
            "{messages[messageIndex]}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;
