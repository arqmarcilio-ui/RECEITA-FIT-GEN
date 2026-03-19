
import React, { useState, useEffect } from 'react';

const LoadingScreen: React.FC = () => {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = [
    "Analisando seu perfil nutricional...",
    "Selecionando ingredientes frescos...",
    "Equilibrando os macronutrientes...",
    "Ajustando o sabor perfeito...",
    "Calculando estimativas de custo...",
    "Finalizando sua receita exclusiva..."
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % messages.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-white p-10 space-y-12 animate-in fade-in duration-700">
      <div className="relative">
        <div className="w-32 h-32 border-[12px] border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center font-black text-emerald-500 text-xs">GEN</div>
      </div>
      <div className="text-center space-y-6 max-w-xs">
        <h2 className="text-4xl font-black text-slate-900 uppercase leading-none">
          Criando sua<br/><span className="text-emerald-500">Refeição</span>
        </h2>
        <div className="h-8 overflow-hidden">
          <p key={messageIndex} className="text-slate-400 font-bold italic text-lg animate-in slide-in-from-bottom-2 duration-500">
            "{messages[messageIndex]}"
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoadingScreen;