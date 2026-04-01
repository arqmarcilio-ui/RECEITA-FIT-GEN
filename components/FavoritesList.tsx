
import React, { useState, useEffect } from 'react';
import { RecipeResult } from '../types';
import { Language, translations } from '../translations';
import { ArrowLeft, Heart, Clock, Flame, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredFavs = favs.filter(r => 
    r.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white flex flex-col pb-32">
      {/* Header */}
      <div className="px-8 pt-16 pb-4 space-y-6">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 p-3 bg-slate-50 text-slate-900 rounded-full hover:bg-slate-100 transition-all w-fit group"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest pr-1">{t.signOut}</span>
        </button>
        <h2 className="text-5xl font-black text-slate-900 uppercase leading-none tracking-tighter">
          {t.favoritesTitle}
        </h2>
      </div>

      {/* Search Bar */}
      <div className="px-8 pb-8">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-emerald-500/20 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-black placeholder:uppercase placeholder:tracking-widest placeholder:text-[10px]"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-8 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 font-black uppercase tracking-widest text-xs">
            <p>{t.loading}</p>
          </div>
        ) : filteredFavs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 font-black uppercase tracking-widest text-xs space-y-6">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 opacity-20" />
            </div>
            <p>{searchTerm ? t.noResults : t.noFavorites}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredFavs.map((r, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => onSelect(r)}
                className="bg-white p-4 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col gap-4 cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className="relative aspect-square w-full rounded-[2rem] overflow-hidden shadow-md">
                  <img 
                    src={r.imageUrl || `https://picsum.photos/seed/${r.id}/400/400`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    alt={r.title} 
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm text-rose-500 rounded-full flex items-center justify-center shadow-sm z-10">
                    <Heart className="w-4 h-4 fill-current" />
                  </div>
                </div>
                <div className="space-y-2 px-1">
                  <h4 className="font-black text-sm text-slate-900 uppercase leading-tight group-hover:text-emerald-500 transition-colors">
                    {r.title}
                  </h4>
                  <div className="flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      <Flame className="w-3 h-3 text-orange-500" />
                      {r.macros.calories.split(' ')[0]}
                    </div>
                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      <Clock className="w-3 h-3 text-emerald-500" />
                      {r.estimatedTime}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
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
