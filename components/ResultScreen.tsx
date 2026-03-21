
import React, { useState, useEffect } from 'react';
import { RecipeResult } from '../types';
import { db, doc, updateDoc } from '../firebase';

interface ResultScreenProps {
  recipe: RecipeResult;
  onBack: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ recipe, onBack }) => {
  const [isFav, setIsFav] = useState(recipe.isFavorite || false);

  useEffect(() => {
    setIsFav(recipe.isFavorite || false);
  }, [recipe.id, recipe.isFavorite]);

  const toggleFav = async () => {
    const newFavStatus = !isFav;
    setIsFav(newFavStatus);
    
    // Atualiza no Firestore se houver um ID
    if (recipe.id) {
      try {
        await updateDoc(doc(db, 'recipes', recipe.id), {
          isFavorite: newFavStatus
        });
        recipe.isFavorite = newFavStatus;
      } catch (e) {
        console.error("Erro ao atualizar favorito no Firestore:", e);
      }
    }

    // Mantém o localStorage como backup
    try {
      const favs = JSON.parse(localStorage.getItem('fit_gen_favs') || '[]');
      const newFavs = newFavStatus ? [...favs, recipe] : favs.filter((f: RecipeResult) => f.title !== recipe.title);
      localStorage.setItem('fit_gen_favs', JSON.stringify(newFavs));
    } catch (e) {
      console.error("Error toggling favorite local", e);
    }
  };

  const shareWA = async () => {
    const ingredientsText = recipe.ingredients.map(ing => `• ${ing}`).join('\n');
    const instructionsText = recipe.instructions.map((step, i) => `${i + 1}. ${step}`).join('\n');
    
    // Se a imagem for uma URL (não base64), inclui no texto
    const imageUrlText = (recipe.imageUrl && !recipe.imageUrl.startsWith('data:')) 
      ? `\n\n*Imagem:*\n${recipe.imageUrl}` 
      : '';

    // Link do App para visualização direta com preview profissional (SSR)
    const appUrl = `${window.location.origin}/receita/${recipe.id}`;
    
    const text = `*Receita Fit:*\n\n${recipe.title.toUpperCase()}\n\n${recipe.description}\n\n*🛒 INGREDIENTES:*\n${ingredientsText}\n\n*👨‍🍳 MODO DE PREPARO:*\n${instructionsText}\n\n*📊 MACROS:* ${recipe.macros.calories} | Prot: ${recipe.macros.protein}\n\n*💰 CUSTO ESTIMADO:* ${recipe.estimatedCost}\n\n*🔗 VEJA NO APP:*\n${appUrl}${imageUrlText}`;
    
    // Tenta usar a Web Share API para enviar com imagem (funciona melhor em dispositivos móveis)
    if (navigator.share) {
      try {
        const shareData: any = {
          title: `Receita: ${recipe.title}`,
          text: text,
        };

        // Se houver imagem e for base64, tenta converter para arquivo
        if (recipe.imageUrl && recipe.imageUrl.startsWith('data:')) {
          try {
            const response = await fetch(recipe.imageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'receita-fit.png', { type: 'image/png' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              shareData.files = [file];
            }
          } catch (imgErr) {
            console.warn("Não foi possível processar a imagem para compartilhamento", imgErr);
          }
        }

        await navigator.share(shareData);
        return;
      } catch (e) {
        // Se o usuário cancelar ou der erro, não faz nada ou segue para o fallback
        console.log("Compartilhamento cancelado ou não suportado", e);
      }
    }

    // Fallback para o link direto do WhatsApp (apenas texto)
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="h-screen bg-white overflow-y-auto pb-32">
      {/* Hero Image */}
      <div className="relative h-96">
        <img src={recipe.imageUrl} className="w-full h-full object-cover" alt={recipe.title} />
        <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent"></div>
        <button 
          onClick={toggleFav}
          className={`absolute top-6 right-6 w-16 h-16 rounded-full flex items-center justify-center shadow-2xl transition-all ${
            isFav ? 'bg-red-500 text-white' : 'bg-white text-slate-400 border-2 border-slate-100'
          }`}
        >
          <svg className="w-8 h-8" fill={isFav ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="px-6 -mt-16 relative z-10 space-y-8">
        <div className="space-y-3">
          <h1 className="text-4xl font-black text-slate-900 leading-[1.1]">{recipe.title}</h1>
          <div className="flex gap-2">
            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-black uppercase border border-emerald-100">{recipe.estimatedTime}</span>
            <span className="px-4 py-1.5 bg-yellow-50 text-yellow-700 rounded-full text-[10px] font-black uppercase border border-yellow-100">{recipe.estimatedCost}</span>
          </div>
        </div>

        {/* Macros Board */}
        <div className="grid grid-cols-4 gap-2 p-5 bg-slate-900 rounded-[2.5rem] text-white text-center shadow-2xl">
          <div className="border-r border-white/10"><p className="text-[9px] opacity-60 uppercase font-black mb-1">Prot</p><p className="font-black text-lg">{recipe.macros.protein}</p></div>
          <div className="border-r border-white/10"><p className="text-[9px] opacity-60 uppercase font-black mb-1">Carb</p><p className="font-black text-lg">{recipe.macros.carbs}</p></div>
          <div className="border-r border-white/10"><p className="text-[9px] opacity-60 uppercase font-black mb-1">Gord</p><p className="font-black text-lg">{recipe.macros.fats}</p></div>
          <div><p className="text-[9px] opacity-60 uppercase font-black mb-1">Kcal</p><p className="font-black text-lg">{recipe.macros.calories}</p></div>
        </div>

        <p className="text-slate-600 text-lg font-medium leading-relaxed italic">"{recipe.description}"</p>

        {/* Section: Ingredients */}
        <section className="bg-emerald-50/50 p-6 rounded-[2rem] border-2 border-emerald-50">
          <h3 className="text-xl font-black text-emerald-700 uppercase mb-4 tracking-tight flex items-center gap-2">
            <span className="w-2 h-8 bg-emerald-500 rounded-full"></span> Ingredientes
          </h3>
          <ul className="space-y-3">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="text-slate-800 font-bold flex gap-3 text-lg">
                <span className="text-emerald-500">✓</span> {ing}
              </li>
            ))}
          </ul>
        </section>

        {/* Section: Preparation */}
        <section className="pb-10">
          <h3 className="text-xl font-black text-slate-900 uppercase mb-6 tracking-tight flex items-center gap-2">
            <span className="w-2 h-8 bg-slate-900 rounded-full"></span> Modo de Preparo
          </h3>
          <div className="space-y-6">
            {recipe.instructions.map((step, i) => (
              <div key={i} className="flex gap-4">
                <span className="w-10 h-10 flex-shrink-0 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-emerald-100">{i+1}</span>
                <p className="text-slate-800 leading-relaxed font-bold text-lg pt-1">{step}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Sticky Actions */}
      <div className="fixed bottom-0 left-0 w-full p-6 bg-white/80 backdrop-blur-xl border-t border-slate-100 grid grid-cols-2 gap-4 z-20">
        <button onClick={onBack} className="py-5 bg-slate-100 text-slate-700 font-black rounded-[1.5rem] uppercase active:scale-95 transition-all border-2 border-slate-200">Início</button>
        <button onClick={shareWA} className="py-5 bg-emerald-500 text-white font-black rounded-[1.5rem] shadow-xl active:scale-95 transition-all uppercase flex items-center justify-center gap-2">
           WhatsApp
        </button>
      </div>
    </div>
  );
};

export default ResultScreen;
