import React, { useState, useEffect, useMemo } from 'react';
import { RecipeResult, DietaryFilter, resolveRecipeHistoryType } from '../types';
import { Language, translations } from '../translations';
import { ArrowLeft, Clock, Flame, History, Search, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { db, collection, query, orderBy, limit, onSnapshot } from '../firebase';
import { safeSaveToLocalStorage } from '../services/storageService';

export type HistoryTab = 'mine' | 'all' | 'profile';

export type HistoryProfileFilter =
  | 'Todos os perfis'
  | DietaryFilter.VEGANO
  | DietaryFilter.VEGETARIANA
  | DietaryFilter.SEM_LACTOSE
  | DietaryFilter.SEM_GLUTEN
  | DietaryFilter.SEM_ACUCAR;

export type HistoryTypeFilter =
  | 'Todos os tipos'
  | 'Café da manhã'
  | 'Almoço'
  | 'Jantar'
  | 'Sobremesa'
  | 'Bebida';

interface HistoryListProps {
  onSelect: (r: RecipeResult) => void;
  onBack: () => void;
  language: Language;
  initialTab?: HistoryTab;
}

export const ALL_PROFILES_OPTION: HistoryProfileFilter = 'Todos os perfis';
export const ALL_TYPES_OPTION: HistoryTypeFilter = 'Todos os tipos';

export const PROFILE_FILTER_OPTIONS: HistoryProfileFilter[] = [
  ALL_PROFILES_OPTION,
  DietaryFilter.VEGANO,
  DietaryFilter.VEGETARIANA,
  DietaryFilter.SEM_LACTOSE,
  DietaryFilter.SEM_GLUTEN,
  DietaryFilter.SEM_ACUCAR,
];

export const TYPE_FILTER_OPTIONS: HistoryTypeFilter[] = [
  ALL_TYPES_OPTION,
  'Café da manhã',
  'Almoço',
  'Jantar',
  'Sobremesa',
  'Bebida',
];

export const HISTORY_FILTERS_STORAGE_KEY = 'fit_gen_hist_filters';

export interface PersistedHistoryFilters {
  profile: HistoryProfileFilter;
  type: HistoryTypeFilter;
}

export function loadPersistedHistoryFilters(): PersistedHistoryFilters {
  try {
    const saved = localStorage.getItem(HISTORY_FILTERS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      const validProfile = PROFILE_FILTER_OPTIONS.includes(parsed?.profile)
        ? (parsed.profile as HistoryProfileFilter)
        : ALL_PROFILES_OPTION;
      const validType = TYPE_FILTER_OPTIONS.includes(parsed?.type)
        ? (parsed.type as HistoryTypeFilter)
        : ALL_TYPES_OPTION;
      return { profile: validProfile, type: validType };
    }
  } catch (e) {
    console.warn('Erro ao carregar filtros persistidos do histórico:', e);
  }
  return { profile: ALL_PROFILES_OPTION, type: ALL_TYPES_OPTION };
}

export function filterPublicRecipesByProfileAndType(
  recipes: RecipeResult[],
  selectedProfile: HistoryProfileFilter,
  selectedType: HistoryTypeFilter
): RecipeResult[] {
  return recipes.filter(r => {
    // 1. Filtro de Perfil Alimentar (baseado estritamente no campo estruturado dietaryFilters)
    if (selectedProfile !== ALL_PROFILES_OPTION) {
      const filters = Array.isArray(r.dietaryFilters) ? r.dietaryFilters : [];
      const matchesProfile = filters.some(
        rf => String(rf).trim().toLowerCase() === String(selectedProfile).trim().toLowerCase()
      );
      if (!matchesProfile) return false;
    }

    // 2. Filtro de Tipo / Momento (baseado estritamente em metadados estruturados: historyType -> mealType -> preparationCategory)
    if (selectedType !== ALL_TYPES_OPTION) {
      const recipeType = resolveRecipeHistoryType(r);
      if (!recipeType) return false;
      const matchesType = recipeType.trim().toLowerCase() === selectedType.trim().toLowerCase();
      if (!matchesType) return false;
    }

    return true;
  });
}

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
  const [recipeToDelete, setRecipeToDelete] = useState<RecipeResult | null>(null);

  const handleConfirmDeleteRecipe = () => {
    if (!recipeToDelete) return;
    const updated = myRecipes.filter((item) => {
      if (recipeToDelete.id && item.id) return item.id !== recipeToDelete.id;
      if (recipeToDelete.tempId && item.tempId) return item.tempId !== recipeToDelete.tempId;
      return item !== recipeToDelete && item.title !== recipeToDelete.title;
    });
    setMyRecipes(updated);
    safeSaveToLocalStorage('fit_gen_hist', updated, 100);
    setRecipeToDelete(null);
  };

  // 2. Todas as Receitas (Firestore: public_recipes, limite 100)
  const [publicRecipes, setPublicRecipes] = useState<RecipeResult[]>([]);
  const [loadingPublic, setLoadingPublic] = useState(true);

  // 3. Filtros selecionados para a aba 'Por Perfil / Tipo' (Persistência local em fit_gen_hist_filters)
  const [filters, setFilters] = useState<PersistedHistoryFilters>(() => loadPersistedHistoryFilters());

  const saveFilters = (next: PersistedHistoryFilters) => {
    setFilters(next);
    try {
      localStorage.setItem(HISTORY_FILTERS_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      console.warn('Erro ao salvar filtros do histórico:', e);
    }
  };

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

  const selectProfile = (profile: HistoryProfileFilter) => {
    saveFilters({
      ...filters,
      profile
    });
  };

  const selectType = (type: HistoryTypeFilter) => {
    saveFilters({
      ...filters,
      type
    });
  };

  // Limpa os filtros de Perfil e Tipo (retornando para 'Todos os perfis' e 'Todos os tipos')
  const clearFilters = () => {
    saveFilters({
      profile: ALL_PROFILES_OPTION,
      type: ALL_TYPES_OPTION
    });
  };

  const hasActiveFilter =
    filters.profile !== ALL_PROFILES_OPTION || filters.type !== ALL_TYPES_OPTION;

  // Filtra receitas da aba ativa em memória (instantâneo)
  const displayedRecipes = useMemo(() => {
    let sourceList: RecipeResult[] = [];

    if (activeTab === 'mine') {
      sourceList = myRecipes;
    } else if (activeTab === 'all') {
      sourceList = publicRecipes;
    } else if (activeTab === 'profile') {
      sourceList = filterPublicRecipesByProfileAndType(
        publicRecipes,
        filters.profile,
        filters.type
      );
    }

    // Aplica filtro por busca textual de título se houver
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      return sourceList.filter(r => r.title && r.title.toLowerCase().includes(term));
    }

    return sourceList;
  }, [activeTab, myRecipes, publicRecipes, filters.profile, filters.type, searchTerm]);

  const isLoading = activeTab === 'mine' ? loadingMine : loadingPublic;

  return (
    <div className="min-h-screen bg-white flex flex-col pb-32">
      {/* Header */}
      <div className="px-6 sm:px-8 pt-6 pb-4 space-y-5">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 shadow-sm transition-all w-fit group active:scale-95"
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

      {/* Seção da Aba 'Por Perfil / Tipo': Duas sequências (Perfil Alimentar e Tipo / Momento) + Limpar Filtros */}
      {activeTab === 'profile' && (
        <div className="px-6 sm:px-8 pb-4 space-y-4">
          {/* Sequência 1: PERFIL ALIMENTAR */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t.dietaryProfilesLabel}
              </span>
              {hasActiveFilter && (
                <button
                  onClick={clearFilters}
                  className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1 active:scale-95"
                >
                  <X className="w-3 h-3" />
                  {t.clearFilters}
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {PROFILE_FILTER_OPTIONS.map((profile) => {
                const isSelected = filters.profile === profile;
                return (
                  <button
                    key={profile}
                    onClick={() => selectProfile(profile)}
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

          {/* Sequência 2: TIPO / MOMENTO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {(t as any).historyTypeLabel || 'TIPO / MOMENTO'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {TYPE_FILTER_OPTIONS.map((typeOption) => {
                const isSelected = filters.type === typeOption;
                return (
                  <button
                    key={typeOption}
                    onClick={() => selectType(typeOption)}
                    className={`px-3 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all border-2 active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                        : 'bg-slate-50 text-slate-600 border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    {typeOption}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Barra de Pesquisa */}
      <div className="px-6 sm:px-8 pb-6">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
          <input 
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-slate-50 border-2 border-transparent focus:border-slate-200 focus:bg-white rounded-2xl text-sm font-bold text-slate-900 outline-none transition-all placeholder:text-slate-400 placeholder:font-black placeholder:uppercase placeholder:tracking-widest placeholder:text-[10px]"
          />
        </div>
      </div>

      {/* Lista de Receitas */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-8 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 font-black uppercase tracking-widest text-xs">
            <p>{(t as any).loading || 'Carregando...'}</p>
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
            {displayedRecipes.map((r, i) => {
              const resolvedType = resolveRecipeHistoryType(r);
              return (
                <motion.div 
                  key={r.id || r.tempId || i} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.03, 0.4), duration: 0.3 }}
                  onClick={() => onSelect(r)}
                  className="bg-white p-4 rounded-[2.5rem] border-2 border-slate-50 shadow-sm flex flex-col gap-3 cursor-pointer active:scale-[0.98] transition-all group"
                >
                  <div className="relative aspect-square w-full rounded-none overflow-hidden">
                    <img 
                      src={r.imageUrl || `https://picsum.photos/seed/${r.id || r.tempId}/400/400`} 
                      className="w-full h-full object-cover rounded-none group-hover:scale-110 transition-transform duration-500" 
                      alt={r.title} 
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                    />
                    {activeTab === 'mine' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRecipeToDelete(r);
                        }}
                        title="Apagar do meu histórico"
                        aria-label="Apagar do meu histórico"
                        className="absolute top-2 right-2 z-10 p-2 bg-white/90 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-full shadow-sm transition-all active:scale-90"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 px-1 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 uppercase leading-tight group-hover:text-emerald-500 transition-colors line-clamp-2">
                        {r.title}
                      </h4>

                      {/* Chips sutis com perfis alimentares e tipo quando existirem */}
                      {((r.dietaryFilters && r.dietaryFilters.length > 0) || resolvedType) && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {r.dietaryFilters && r.dietaryFilters.slice(0, 2).map((df, idx) => (
                            <span 
                              key={idx} 
                              className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded-md"
                            >
                              {df}
                            </span>
                          ))}
                          {r.dietaryFilters && r.dietaryFilters.length > 2 && (
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-md">
                              +{r.dietaryFilters.length - 2}
                            </span>
                          )}
                          {resolvedType && (
                            <span className="text-[7px] font-black uppercase px-1.5 py-0.5 bg-sky-50 text-sky-600 rounded-md">
                              {resolvedType}
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
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmação para apagar receita de Minhas Receitas */}
      {recipeToDelete && (
        <div
          className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-6"
          onClick={() => setRecipeToDelete(null)}
        >
          <div
            className="w-full max-w-xs bg-white rounded-3xl p-6 shadow-xl space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <p className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Apagar esta receita do seu histórico?
              </p>
              <p className="text-xs font-bold text-slate-500 line-clamp-2">
                {recipeToDelete.title}
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setRecipeToDelete(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRecipe}
                className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm transition-all active:scale-95"
              >
                Apagar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action */}
      <div className="fixed bottom-0 left-0 right-0 px-6 sm:px-8 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] bg-white border-t border-slate-100 z-50">
        <div className="max-w-xl mx-auto">
          <button 
            onClick={onBack} 
            className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-3xl font-black text-xs sm:text-sm uppercase tracking-widest shadow-md active:scale-95 transition-all"
          >
            {t.back}
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryList;
