
import React, { useState, useEffect } from 'react';
import { RecipeResult } from '../types';
import { Language, translations } from '../translations';
import { ArrowLeft, Heart, Clock, Flame, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface FavoritesListProps {
  onSelect: (r: RecipeResult) => void;
  onBack: () => void;
  language: Language;
}

const FavoritesList: React.FC<FavoritesListProps> = ({ onSelect, onBack, language }) => {
  const t = translations[language];
  const [favs, setFavs] = useState<RecipeResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = () => {
      const favsStr = localStorage.getItem('fit_gen_favs');
      if (favsStr) {
        setFavs(JSON.parse(favsStr));
      }
      setLoading(false);
    };

    fetchFavorites();
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col pb-32">
      {/* Header */}
      <div className="px-8 pt-16 pb-8 space-y-6">
        <button 
          onClick={onBack}
          className="p-3 bg-slate-50 text-slate-900 rounded-full hover:bg-slate-100 transition-all w-fit"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-5xl font-black text-slate-900 uppercase leading-none tracking-tighter">
          {t.favoritesTitle}
        </h2>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-8 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 font-black uppercase tracking-widest text-xs">
            <p>{t.loading}</p>
          </div>
        ) : favs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 font-black uppercase tracking-widest text-xs space-y-6">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 opacity-20" />
            </div>
            <p>{t.noFavorites}</p>
          </div>
        ) : (
          favs.map((r, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onSelect(r)}
              className="bg-white p-5 rounded-[2rem] border-2 border-slate-50 shadow-sm flex gap-5 cursor-pointer active:scale-[0.98] transition-all group"
            >
              <div className="relative w-24 h-24 flex-shrink-0 rounded-3xl overflow-hidden shadow-lg">
                <img 
                  src={r.imageUrl || `https://picsum.photos/seed/${r.id}/200/200`} 
                  className="w-full h-full object-cover" 
                  alt={r.title} 
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm text-rose-500 rounded-full flex items-center justify-center shadow-sm">
                  <Heart className="w-4 h-4 fill-current" />
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-center space-y-2">
                <h4 className="font-black text-xl text-slate-900 uppercase leading-tight truncate group-hover:text-emerald-500 transition-colors">{r.title}</h4>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    {r.macros.calories}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Clock className="w-3.5 h-3.5 text-emerald-500" />
                    {r.estimatedTime}
                  </div>
                </div>
              </div>
              <div className="flex items-center pr-2">
                <ChevronRight className="w-6 h-6 text-slate-200 group-hover:text-emerald-500 transition-colors" />
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-xl mx-auto">
          <button 
            onClick={onBack} 
            className="w-full py-6 bg-slate-900 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
          >
            {t.back}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FavoritesList;
