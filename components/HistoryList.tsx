import React, { useState, useEffect, useMemo } from 'react';
import { RecipeResult, DietaryFilter } from '../types';
import { Language, translations } from '../translations';
import { ArrowLeft, Clock, Flame, History, Search, X } from 'lucide-react';
import { motion } from 'motion/react';
import { db, collection, query, orderBy, limit, onSnapshot } from '../firebase';

export type HistoryTab = 'mine' | 'all' | 'profile';

interface HistoryListProps {
  onSelect: (r: RecipeResult) => void;
  onBack: () => void;
  language: Language;
  initialTab?: HistoryTab;
}

const PROFILE_OPTIONS: DietaryFilter[] = [
  DietaryFilter.VEGANO,
  DietaryFilter.VEGETARIANA,
  DietaryFilter.LOW_CARB,
  DietaryFilter.SEM_LACTOSE,
  DietaryFilter.SEM_GLUTEN,
  DietaryFilter.SEM_ACUCAR,
  DietaryFilter.SEM_RESTRICAO,
];

const PROFILE_STORAGE_KEY = 'fit_gen_hist_profile_filters';

const HistoryList: React.FC<HistoryListProps> = ({ 
  onSelect, 
  onBack, 
  language,
  initialTab = 'mine'
}) => {
  const t = translations[language];

  const [activeTab, setActiveTab] = useState<HistoryTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Minhas Receitas (localStorage: fit_gen_hist)
  const [myRecipes, setMyRecipes] = useState<RecipeResult[]>([]);
  const [loadingMine, setLoadingMine] = useState(true);

  // 2. Todas as Receitas (Firestore: public_recipes, limite 100)
  const [publicRecipes, setPublicRecipes] = useState<RecipeResult[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);

  // 3. Perfis selecionados para a aba 'Por perfil' (Persistência local)
  const [selectedProfiles, setSelectedProfiles] = useState<DietaryFilter[]>(() => {
    try {
      const saved = localStorage.getItem(PROFILE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar filtros de perfil persistidos:', e);
    }
    return [];
  });

  // Carrega histórico local
  useEffect(() => {
    const fetchLocalHistory = () => {
      try {
        const histStr = localStorage.getItem('fit_gen_hist');
        if (histStr) {
          setMyRecipes(JSON.parse(histStr));
        }
      } catch (err) {
        console.error("Erro ao ler fit_gen_hist:", err);
      } finally {
        setLoadingMine(false);
      }
    };

    fetchLocalHistory();
  }, []);

  // Assina receitas públicas do Firestore em tempo real (100 mais recentes)
  useEffect(() => {
    const q = query(
      collection(db, 'public_recipes'),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as RecipeResult[];
      setPublicRecipes(fetched);
      setLoadingPublic(false);
    }, (error) => {
      console.error("Erro ao carregar receitas públicas:", error);
      setLoadingPublic(false);
    });

    return () => unsubscribe();
  }, []);

  // Alterna perfil com suporte a seleção múltipla (lógica AND) e isolamento de "Sem Restrição"
  const toggleProfile = (profile: DietaryFilter) => {
    setSelectedProfiles((prev) => {
      let next: DietaryFilter[];

      if (profile === DietaryFilter.SEM_RESTRICAO) {
        // Se 'Sem Restrição' for clicado:
        // se já estava ativo, remove; se não estava, opera sozinho (desmarca filtros específicos)
        next = prev.includes(DietaryFilter.SEM_RESTRICAO) ? [] : [DietaryFilter.SEM_RESTRICAO];
      } else {
        // Se um perfil específico for clicado:
        // desmarca automaticamente 'Sem Restrição'
        const base = prev.filter(p => p !== DietaryFilter.SEM_RESTRICAO);
        if (base.includes(profile)) {
          next = base.filter(p => p !== profile);
        } else {
          next = [...base, profile];
        }
      }

      try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.warn('Erro ao salvar filtros de perfil:', e);
      }

      return next;
    });
  };

  // Limpa todos os filtros selecionados
  const clearProfiles = () => {
    setSelectedProfiles([]);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify([]));
    } catch (e) {
      console.warn('Erro ao limpar filtros de perfil:', e);
    }
  };

  // Filtra receitas da aba ativa
  const displayedRecipes = useMemo(() => {
    let sourceList: RecipeResult[] = [];

    if (activeTab === 'mine') {
      sourceList = myRecipes;
    } else if (activeTab === 'all') {
      sourceList = publicRecipes;
    } else if (activeTab === 'profile') {
      // Se nenhum perfil foi selecionado, não exibe lista
      if (selectedProfiles.length === 0) {
        return [];
      }

      // Aplica lógica AND sobre as receitas públicas
      // Receitas antigas sem metadados estruturados (dietaryFilters ausente ou vazio)
      // são tratadas como desconhecidas e não incluídas em filtros específicos
      sourceList = publicRecipes.filter(r => {
        const filters = Array.isArray(r.dietaryFilters) ? r.dietaryFilters : [];
        if (filters.length === 0) return false;

        return selectedProfiles.every(selected =>
          filters.some(rf => String(rf).trim().toLowerCase() === String(selected).trim().toLowerCase())
        );
      });
    }

    // Aplica filtro por busca textual de título se houver
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      return sourceList.filter(r => r.title && r.title.toLowerCase().includes(term));
    }

    return sourceList;
  }, [activeTab, myRecipes, publicRecipes, selectedProfiles, searchTerm]);

  const isLoading = activeTab === 'mine' ? loadingMine : loadingPublic;

  return (
    <div className="min-h-screen bg-white flex flex-col pb-32">
      {/* Header */}
      <div className="px-6 sm:px-8 pt-16 pb-4 space-y-5">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 p-3 bg-slate-50 text-slate-900 rounded-full hover:bg-slate-100 transition-all w-fit group active:scale-95"
          title={t.back}
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-widest pr-1">{t.back}</span>
        </button>

        {/* Título Principal Sem Emojis */}
        <h2 className="text-sm font-black text-slate-900 uppercase leading-none tracking-widest">
          {t.historyTitle}
        </h2>

        {/* Três Abas / Botões Segmentados */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 rounded-2xl gap-1">
          <button
            onClick={() => setActiveTab('mine')}
            className={`py-3 px-1 sm:px-2 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all text-center ${
              activeTab === 'mine'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            {t.historyMyRecipes}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`py-3 px-1 sm:px-2 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all text-center ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            {t.historyAllRecipes}
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-1 sm:px-2 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all text-center ${
              activeTab === 'profile'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-400 hover:text-slate-700'
            }`}
          >
            <span className="hidden sm:inline">{t.historyByProfileFull}</span>
            <span className="sm:hidden">{t.historyByProfile}</span>
          </button>
        </div>
      </div>

      {/* Seção da Aba 'Por perfil': Chips de seleção e Limpar Filtros */}
      {activeTab === 'profile' && (
        <div className="px-6 sm:px-8 pb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              {t.dietaryProfilesLabel}
            </span>
            {selectedProfiles.length > 0 && (
              <button
                onClick={clearProfiles}
                className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 active:scale-95"
              >
                <X className="w-3 h-3" />
                {t.clearFilters}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {PROFILE_OPTIONS.map((profile) => {
              const isSelected = selectedProfiles.includes(profile);
              return (
                <button
                  key={profile}
                  onClick={() => toggleProfile(profile)}
                  className={`px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all border-2 active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                      : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {profile}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra de Pesquisa */}
      <div className="px-6 sm:px-8 pb-6">
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

      {/* Lista de Receitas */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-8 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 font-black uppercase tracking-widest text-xs">
            <p>{t.loading}</p>
          </div>
        ) : activeTab === 'profile' && selectedProfiles.length === 0 ? (
          // Mensagem simples quando nenhum perfil está selecionado
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-400 font-black uppercase tracking-widest text-xs space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <History className="w-7 h-7 opacity-20" />
            </div>
            <p className="max-w-xs">{t.selectProfilePrompt}</p>
          </div>
        ) : displayedRecipes.length === 0 ? (
          // Mensagem de lista vazia
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-black uppercase tracking-widest text-xs space-y-4 text-center">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <History className="w-7 h-7 opacity-20" />
            </div>
            <p>
              {searchTerm 
                ? t.noResults 
                : activeTab === 'mine' 
                  ? t.noHistory 
                  : activeTab === 'all' 
                    ? t.noPublicHistory 
                    : t.noProfileHistory}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {displayedRecipes.map((r, i) => (
              <motion.div 
                key={r.id || r.tempId || i} 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.3 }}
                onClick={() => onSelect(r)}
                className="bg-white p-4 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-all group"
              >
                <div className="relative aspect-square w-full rounded-[2rem] overflow-hidden shadow-md">
                  <img 
                    src={r.imageUrl || `https://picsum.photos/seed/${r.id || r.tempId}/400/400`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    alt={r.title} 
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="space-y-2 px-1 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 uppercase leading-tight group-hover:text-emerald-500 transition-colors line-clamp-2">
                      {r.title}
                    </h4>

                    {/* Chips sutis com perfis alimentares quando existirem */}
                    {r.dietaryFilters && r.dietaryFilters.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {r.dietaryFilters.slice(0, 2).map((df, idx) => (
                          <span 
                            key={idx} 
                            className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md"
                          >
                            {df}
                          </span>
                        ))}
                        {r.dietaryFilters.length > 2 && (
                          <span className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                            +{r.dietaryFilters.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between opacity-60 pt-1">
                    <div className="flex items-center gap-1 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                      <Flame className="w-3 h-3 text-orange-500" />
                      {r.macros?.calories ? r.macros.calories.split(' ')[0] : ''}
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
      <div className="fixed bottom-0 left-0 right-0 p-6 sm:p-8 bg-white/80 backdrop-blur-md z-50">
        <div className="max-w-xl mx-auto">
          <button 
            onClick={onBack} 
            className="w-full py-5 sm:py-6 bg-slate-900 text-white rounded-3xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-2xl active:scale-95 transition-all"
          >
            {t.back}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryList;
