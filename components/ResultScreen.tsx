import React, { useState, useEffect } from 'react';
import { RecipeResult } from '../types';
import { translations, Language } from '../translations';
import {
  ArrowLeft,
  Heart,
  Share2,
  CheckCircle2,
  UtensilsCrossed,
} from 'lucide-react';
import { motion } from 'motion/react';

interface ResultScreenProps {
  recipe: RecipeResult;
  language: Language;
  onBack: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ recipe, language, onBack }) => {
  const t = translations[language];
  const [isFavorite, setIsFavorite] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);

  useEffect(() => {
    const favsStr = localStorage.getItem('fit_gen_favs');
    if (favsStr) {
      const favs = JSON.parse(favsStr);
      setIsFavorite(favs.some((f: RecipeResult) => f.id === recipe.id || f.tempId === recipe.tempId));
    }
  }, [recipe.id, recipe.tempId]);

  const toggleFavorite = () => {
    const favsStr = localStorage.getItem('fit_gen_favs');
    let favs = favsStr ? JSON.parse(favsStr) : [];

    if (isFavorite) {
      favs = favs.filter((f: RecipeResult) => f.id !== recipe.id && f.tempId !== recipe.tempId);
    } else {
      favs.push({ ...recipe, isFavorite: true });
    }

    localStorage.setItem('fit_gen_favs', JSON.stringify(favs));
    setIsFavorite(!isFavorite);
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?id=${recipe.id || recipe.tempId}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.title,
          text: recipe.description,
          url: shareUrl,
        });
      } catch (err) {
        console.error("Erro ao compartilhar:", err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Link copiado para a área de transferência!');
    }
  };

  const handleWhatsAppShare = () => {
    const text = `*${recipe.title}*\n\n${recipe.description}\n\n*Ingredientes:*\n${recipe.ingredients.map(i => `- ${i}`).join('\n')}\n\n*Modo de Preparo:*\n${recipe.instructions.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nGerado por Receita Fit Gen`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const toggleIngredient = (ing: string) => {
    setCheckedIngredients(prev =>
      prev.includes(ing) ? prev.filter(i => i !== ing) : [...prev, ing]
    );
  };

  const MacroBar = ({ label, value, color, percentage }: { label: string; value: string; color: string; percentage: number }) => (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-olive/60">
        <span>{label}</span>
        <span className="text-ink">{value}</span>
      </div>
      <div className="h-1.5 w-full bg-olive/5 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full ${color} rounded-full`}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-white pb-32">
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md px-8 py-6 flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 p-3 bg-slate-100 text-slate-900 rounded-full hover:bg-slate-200 transition-all group">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest pr-1">{t.signOut}</span>
        </button>
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">{t.recipeResult}</h2>
        <div className="flex gap-2">
          <button
            onClick={toggleFavorite}
            className={`p-3 rounded-full transition-all ${isFavorite ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-900 hover:bg-slate-200'}`}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
          <button onClick={handleShare} className="p-3 bg-slate-100 text-slate-900 rounded-full hover:bg-slate-200 transition-all">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="px-8 space-y-10">
        <div className="space-y-6">
          <div className="relative rounded-[2.5rem] overflow-hidden aspect-video shadow-2xl">
            {recipe.imageUrl ? (
              <img
                src={`${recipe.imageUrl}${recipe.imageUrl.includes('?') ? '&' : '?'}v=${recipe.tempId || recipe.id || Date.now()}`}
                alt={recipe.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-sm font-bold px-6 text-center">
                Não foi possível gerar a imagem desta receita.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h1 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tighter">
              {recipe.title}
            </h1>
            <p className="text-slate-400 font-bold text-sm uppercase tracking-tight leading-relaxed">
              {recipe.description}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="p-5 bg-slate-100 rounded-3xl text-center space-y-1">
            <p className="text-[8px] font-black uppercase text-slate-500 tracking-widest">CAL</p>
            <p className="text-sm font-black text-slate-900">{recipe.macros.calories}</p>
          </div>
          <div className="p-5 bg-emerald-50 rounded-3xl text-center space-y-1">
            <p className="text-[8px] font-black uppercase text-emerald-500 tracking-widest">PROT</p>
            <p className="text-sm font-black text-emerald-600">{recipe.macros.protein}</p>
          </div>
          <div className="p-5 bg-orange-50 rounded-3xl text-center space-y-1">
            <p className="text-[8px] font-black uppercase text-orange-500 tracking-widest">CARB</p>
            <p className="text-sm font-black text-orange-600">{recipe.macros.carbs}</p>
          </div>
          <div className="p-5 bg-rose-50 rounded-3xl text-center space-y-1">
            <p className="text-[8px] font-black uppercase text-rose-500 tracking-widest">FATS</p>
            <p className="text-sm font-black text-rose-600">{recipe.macros.fats}</p>
          </div>
        </div>

        <div className="flex p-1.5 bg-slate-100 rounded-full">
          <button
            onClick={() => setShowShoppingList(false)}
            className={`flex-1 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${!showShoppingList ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.recipeResult}
          </button>
          <button
            onClick={() => setShowShoppingList(true)}
            className={`flex-1 py-4 rounded-full font-black text-[10px] uppercase tracking-widest transition-all ${showShoppingList ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.shoppingList}
          </button>
        </div>

        <div className="min-h-[300px]">
          {!showShoppingList ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
              <div className="space-y-6">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                  <UtensilsCrossed className="w-6 h-6 text-emerald-500" />
                  {t.ingredientsList}
                </h3>
                <div className="space-y-3">
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center gap-4 p-5 bg-slate-100 rounded-3xl">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full flex-shrink-0" />
                      <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">{ing}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  {t.instructionsList}
                </h3>
                <div className="space-y-8">
                  {recipe.instructions.map((step, i) => (
                    <div key={i} className="space-y-3">
                      <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">{t.step} {i + 1}</p>
                      <div className="p-6 bg-slate-100 rounded-[2rem]">
                        <p className="text-sm font-bold text-slate-900 leading-relaxed uppercase tracking-tight">{step}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex justify-between items-center mb-6 px-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {checkedIngredients.length} / {recipe.ingredients.length} {t.items}
                </p>
              </div>
              {recipe.ingredients.map((ing, i) => (
                <button
                  key={i}
                  onClick={() => toggleIngredient(ing)}
                  className={`w-full flex items-center gap-5 p-5 rounded-3xl transition-all text-left ${checkedIngredients.includes(ing) ? 'bg-slate-100 opacity-50' : 'bg-white border-2 border-slate-100 shadow-sm'}`}
                >
                  <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${checkedIngredients.includes(ing) ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                    {checkedIngredients.includes(ing) && <CheckCircle2 className="w-4 h-4 text-white" />}
                  </div>
                  <p className={`text-sm font-black uppercase tracking-tight ${checkedIngredients.includes(ing) ? 'line-through text-slate-500' : 'text-slate-900'}`}>{ing}</p>
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-xl mx-auto flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 py-6 bg-slate-100 text-slate-900 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-sm active:scale-95 transition-all"
          >
            {t.backToStart}
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="flex-1 py-6 bg-emerald-500 text-white rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl active:scale-95 transition-all flex items-center justify-center"
          >
            Whatsapp
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
