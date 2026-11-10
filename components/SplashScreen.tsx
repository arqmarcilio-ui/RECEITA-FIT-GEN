import React, { useState, useEffect } from 'react';
import { Language, translations } from '../translations';
import { RecipeResult } from '../types';
import { History } from 'lucide-react';
import { db, collection, query, orderBy, limit, onSnapshot } from '../firebase';

const SHOWCASE_CACHE_KEY = 'fit_gen_showcase_cache';

const FALLBACK_SHOWCASE_RECIPES: RecipeResult[] = [
  {
    id: 'fallback-1',
    title: 'Bowl Proteico de Frango Grelhado',
    description: 'Frango grelhado com quinoa, abacate e legumes frescos.',
    ingredients: [],
    instructions: [],
    macros: { calories: '420 kcal', protein: '38g', carbs: '32g', fats: '14g' },
    estimatedTime: '20 min',
    imageUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'fallback-2',
    title: 'Omelete Verde com Espinafre',
    description: 'Omelete leve com espinafre, ricota e ervas frescas.',
    ingredients: [],
    instructions: [],
    macros: { calories: '280 kcal', protein: '24g', carbs: '6g', fats: '16g' },
    estimatedTime: '12 min',
    imageUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=600&auto=format&fit=crop'
  },
  {
    id: 'fallback-3',
    title: 'Panqueca de Banana e Aveia',
    description: 'Panqueca nutritiva sem açúcar com frutas vermelhas.',
    ingredients: [],
    instructions: [],
    macros: { calories: '310 kcal', protein: '16g', carbs: '42g', fats: '8g' },
    estimatedTime: '15 min',
    imageUrl: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=600&auto=format&fit=crop'
  }
];

function getLocalUserRecipes(): RecipeResult[] {
  try {
    const raw = localStorage.getItem('fit_gen_hist');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r: RecipeResult) => r && typeof r.imageUrl === 'string' && r.imageUrl.trim() !== '');
  } catch {
    return [];
  }
}

function getCachedShowcase(): RecipeResult[] {
  try {
    const raw = localStorage.getItem(SHOWCASE_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((r: RecipeResult) => r && typeof r.imageUrl === 'string' && r.imageUrl.trim() !== '').slice(0, 3);
  } catch {
    return [];
  }
}

export interface TopRecipeShowcaseProps {
  userUid?: string | null;
  userEmail?: string | null;
  onSelectRecipe?: (recipe: RecipeResult) => void;
}

export const TopRecipeShowcase: React.FC<TopRecipeShowcaseProps> = ({
  userUid,
  userEmail,
  onSelectRecipe
}) => {
  const [localRecipes, setLocalRecipes] = useState<RecipeResult[]>(() => getLocalUserRecipes());
  const [publicRecipes, setPublicRecipes] = useState<RecipeResult[]>(() => getCachedShowcase());

  useEffect(() => {
    setLocalRecipes(getLocalUserRecipes());
  }, [userUid, userEmail]);

  useEffect(() => {
    const q = query(
      collection(db, 'public_recipes'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched = snapshot.docs
          .map((docSnap) => ({
            ...(docSnap.data() as RecipeResult),
            id: docSnap.id
          }))
          .filter((r) => r && typeof r.imageUrl === 'string' && r.imageUrl.trim() !== '');

        if (fetched.length > 0) {
          setPublicRecipes(fetched);
          try {
            localStorage.setItem(
              SHOWCASE_CACHE_KEY,
              JSON.stringify(
                fetched.slice(0, 3).map((r) => ({
                  id: r.id,
                  tempId: r.tempId,
                  title: r.title,
                  description: r.description,
                  imageUrl: r.imageUrl,
                  ingredients: r.ingredients || [],
                  instructions: r.instructions || [],
                  macros: r.macros || { calories: '', protein: '', carbs: '', fats: '' },
                  estimatedTime: r.estimatedTime || '',
                  estimatedCost: r.estimatedCost,
                  peopleCount: r.peopleCount
                }))
              )
            );
          } catch {
            // Ignore storage errors
          }
        }
      },
      (err) => {
        console.warn('[TopRecipeShowcase] Aviso ao carregar vitrine de receitas:', err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Regra de conteúdo:
  // 1. Se a pessoa já tiver receitas geradas (no histórico local ou associadas ao seu usuário), prioriza as 3 últimas receitas da própria pessoa.
  // 2. Se for a primeira vez ou não tiver receitas próprias suficientes, exibe as 3 receitas mais recentes do histórico geral.
  const displayRecipes = React.useMemo(() => {
    const selected: RecipeResult[] = [];
    const seenKeys = new Set<string>();

    const addUnique = (r: RecipeResult) => {
      if (!r || !r.imageUrl || !r.imageUrl.trim()) return;
      const key = `${r.id || ''}|${r.tempId || ''}|${(r.title || '').trim().toLowerCase()}`;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      selected.push(r);
    };

    // 1. Receitas próprias no dispositivo (fit_gen_hist)
    for (const r of localRecipes) {
      if (selected.length >= 3) break;
      addUnique(r);
    }

    // 2. Receitas próprias salvas no Firestore (caso o usuário tenha histórico na conta)
    if (selected.length < 3 && (userUid || userEmail)) {
      const normalizedEmail = userEmail?.trim().toLowerCase();
      for (const r of publicRecipes as any[]) {
        if (selected.length >= 3) break;
        const isAuthor =
          (userUid && r.authorId === userUid) ||
          (normalizedEmail && typeof r.authorEmail === 'string' && r.authorEmail.trim().toLowerCase() === normalizedEmail);
        if (isAuthor) {
          addUnique(r);
        }
      }
    }

    // 3. Se não tiver receitas próprias (ou tiver menos de 3), completa com as mais recentes do histórico geral
    if (selected.length < 3) {
      for (const r of publicRecipes) {
        if (selected.length >= 3) break;
        addUnique(r);
      }
    }

    // 4. Fallback visual imediato caso ainda esteja carregando no primeiro acesso
    if (selected.length < 3) {
      for (const r of FALLBACK_SHOWCASE_RECIPES) {
        if (selected.length >= 3) break;
        addUnique(r);
      }
    }

    return selected.slice(0, 3);
  }, [localRecipes, publicRecipes, userUid, userEmail]);

  return (
    <div className="w-full h-[32dvh] min-h-[190px] max-h-[270px] flex-shrink-0 overflow-hidden rounded-b-[2rem] bg-slate-100 shadow-sm">
      <div className="grid grid-cols-3 gap-1 w-full h-full">
        {displayRecipes.map((recipe, idx) => {
          const isInteractive = Boolean(onSelectRecipe && recipe.ingredients && recipe.ingredients.length > 0);
          return (
            <div
              key={recipe.id || recipe.tempId || idx}
              onClick={() => {
                if (isInteractive && onSelectRecipe) {
                  onSelectRecipe(recipe);
                }
              }}
              className={`relative w-full h-full overflow-hidden bg-slate-100 group ${
                isInteractive ? 'cursor-pointer' : ''
              }`}
            >
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent pointer-events-none" />
              <div className="absolute bottom-0 left-0 right-0 p-2.5 pointer-events-none">
                <p className="text-[9px] leading-tight font-black text-white uppercase tracking-wider line-clamp-2 drop-shadow-sm text-left">
                  {recipe.title}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface SplashScreenProps {
  onStart: () => void;
  onOpenFavorites: () => void;
  onOpenHistory: () => void;
  onOpenPublicHistory?: () => void;
  onSelectRecipe?: (recipe: RecipeResult) => void;
  userUid?: string | null;
  userEmail?: string | null;
  language?: Language;
  onLanguageChange?: (lang: Language) => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ 
  onStart, 
  onOpenHistory,
  onSelectRecipe,
  userUid,
  userEmail,
  language = 'pt'
}) => {
  const t = translations[language];

  return (
    <div className="flex flex-col justify-between min-h-[100dvh] text-center bg-white relative overflow-hidden">
      <TopRecipeShowcase
        userUid={userUid}
        userEmail={userEmail}
        onSelectRecipe={onSelectRecipe}
      />

      <div className="flex-1 flex flex-col items-center justify-center px-8 py-4 w-full max-w-sm mx-auto relative z-10">
        <div className="space-y-3 mb-8 sm:mb-10">
          <h1 className="text-5xl sm:text-6xl font-black text-slate-900 leading-none tracking-tighter uppercase">
            RECEITA<br/>
            <span className="text-emerald-500">FIT GEN</span>
          </h1>
          <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.35em]">
            {t.appSubtitle}
          </p>
        </div>

        <div className="w-full space-y-4">
          <button 
            onClick={onStart}
            className="w-full py-5 bg-emerald-500 text-white rounded-3xl font-black text-2xl uppercase tracking-widest shadow-xl active:scale-95 transition-all"
          >
            {t.start}
          </button>
          
          <div className="flex flex-col gap-3">
            <button 
              onClick={onOpenHistory}
              className="flex items-center justify-center gap-2 py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-3xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all"
            >
              <History className="w-4 h-4 text-emerald-500" />
              {t.history}
            </button>
          </div>
        </div>
      </div>
      
      <div className="pb-5 pt-2 flex flex-col items-center gap-1.5 z-20 flex-shrink-0">
        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
          <a href="/politica-de-privacidade" className="hover:text-emerald-600 transition-colors">
            Privacidade
          </a>
          <span>•</span>
          <a href="/excluir-conta" className="hover:text-emerald-600 transition-colors">
            Excluir Conta
          </a>
        </div>
        <div className="text-slate-300 text-[9px] font-black uppercase tracking-[0.4em]">
          {t.poweredBy}
        </div>
        <div className="px-4 py-1 bg-slate-50 text-slate-400 text-[8px] font-black tracking-widest uppercase rounded-full">
          {t.version} 2.2
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
