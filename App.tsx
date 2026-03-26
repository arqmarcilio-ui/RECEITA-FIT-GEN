
import React, { useState, useEffect } from 'react';
import { DietaryFilter, MealType, CalorieLevel, Flavor, SkillLevel, UserPreferences, RecipeResult } from './types';
import { generateRecipe } from './services/geminiService';
import { safeSaveToLocalStorage } from './services/storageService';
import SplashScreen from './components/SplashScreen';
import StepForm from './components/StepForm';
import ResultScreen from './components/ResultScreen';
import FavoritesList from './components/FavoritesList';
import HistoryList from './components/HistoryList';
import LoadingScreen from './components/LoadingScreen';
import { Language, translations } from './translations';
import { LogOut, ShieldAlert, ChefHat, X } from 'lucide-react';

const App: React.FC = () => {
  const [view, setView] = useState<'splash' | 'form' | 'loading' | 'result' | 'favs' | 'hist'>('splash');
  const [language, setLanguage] = useState<Language>('pt');
  const t = translations[language];
  const [prefs, setPrefs] = useState<UserPreferences>({
    dietaryFilters: [DietaryFilter.SEM_RESTRICAO],
    mealType: MealType.ALMOCO,
    dishType: '',
    peopleCount: 1,
    calorieLevel: CalorieLevel.MEDIO,
    flavor: Flavor.SALGADO,
    ingredients: '',
    dispensableIngredients: '',
    skillLevel: SkillLevel.BASICA
  });
  const [result, setResult] = useState<RecipeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const recipeId = params.get('id');
    
    if (recipeId) {
      const historyStr = localStorage.getItem('fit_gen_hist');
      const favoritesStr = localStorage.getItem('fit_gen_favs');
      const allRecipes = [
        ...(historyStr ? JSON.parse(historyStr) : []),
        ...(favoritesStr ? JSON.parse(favoritesStr) : [])
      ];
      
      const found = allRecipes.find(r => r.id === recipeId || r.tempId === recipeId);
      if (found) {
        setResult(found);
        setView('result');
      }
    }
  }, []);

  const handleGenerate = async (data: UserPreferences) => {
    const currentGenerationId = Math.random().toString(36).substring(7);
    console.log(`[App] Iniciando geração de receita #${currentGenerationId}...`);
    
    setPrefs(data);
    setView('loading');
    setError(null);
    try {
      const recipe = await generateRecipe(data);
      recipe.id = recipe.tempId; // Use tempId as ID for local storage
      
      setResult(recipe);
      setView('result');
      
      // Save to history
      const historyStr = localStorage.getItem('fit_gen_hist');
      let history = historyStr ? JSON.parse(historyStr) : [];
      const newHistory = [recipe, ...history].slice(0, 20);
      safeSaveToLocalStorage('fit_gen_hist', newHistory, 20);
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || t.errorGeneric);
      setView('form');
    }
  };

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-white relative font-sans selection:bg-emerald-100">
      {view === 'splash' && (
        <SplashScreen 
          language={language} 
          onLanguageChange={setLanguage} 
          onStart={() => setView('form')} 
          onOpenFavorites={() => setView('favs')} 
          onOpenHistory={() => setView('hist')} 
        />
      )}
      
      {view === 'form' && (
        <div className="relative h-full">
          {error && (
            <div className="absolute top-8 left-8 right-8 z-50 bg-rose-50 border border-rose-100 p-5 rounded-3xl flex items-start gap-4 shadow-xl animate-in fade-in slide-in-from-top-8">
              <div className="w-10 h-10 bg-rose-500 rounded-2xl flex items-center justify-center flex-shrink-0">
                <ShieldAlert className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-rose-900 font-black text-sm uppercase tracking-widest">{t.errorTitle}</p>
                <p className="text-rose-700 text-xs font-medium mt-1">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-900 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
          <StepForm initialData={prefs} language={language} onCancel={() => setView('splash')} onSubmit={handleGenerate} />
        </div>
      )}
      
      {view === 'loading' && <LoadingScreen language={language} />}

      {view === 'result' && result && (
        <ResultScreen 
          recipe={result} 
          language={language} 
          onBack={() => setView('splash')} 
        />
      )}
      
      {view === 'favs' && (
        <FavoritesList 
          language={language} 
          onSelect={(r) => { setResult(r); setView('result'); }} 
          onBack={() => setView('splash')} 
        />
      )}
      
      {view === 'hist' && (
        <HistoryList 
          language={language} 
          onSelect={(r) => { setResult(r); setView('result'); }} 
          onBack={() => setView('splash')} 
        />
      )}
    </div>
  );
};

export default App;
