
import React, { useState } from 'react';
import { DietaryFilter, MealType, CalorieLevel, Flavor, SkillLevel, UserPreferences, RecipeResult } from './types';
import { generateRecipe } from './services/geminiService';
import SplashScreen from './components/SplashScreen';
import StepForm from './components/StepForm';
import ResultScreen from './components/ResultScreen';
import FavoritesList from './components/FavoritesList';
import HistoryList from './components/HistoryList';
import LoadingScreen from './components/LoadingScreen';

const App: React.FC = () => {
  const [view, setView] = useState<'splash' | 'form' | 'loading' | 'result' | 'favs' | 'hist'>('splash');
  const [prefs, setPrefs] = useState<UserPreferences>({
    dietaryFilters: [DietaryFilter.SEM_RESTRICAO], // Inicia com Sem Restrição
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

  const handleGenerate = async (data: UserPreferences) => {
    setPrefs(data);
    setView('loading');
    try {
      const recipe = await generateRecipe(data);
      setResult(recipe);
      
      // Armazenamento seguro do histórico para evitar QuotaExceededError
      try {
        const historyStr = localStorage.getItem('fit_gen_hist');
        let history = historyStr ? JSON.parse(historyStr) : [];
        const newHistory = [recipe, ...history].slice(0, 20); // Reduzido de 50 para 20 para economizar espaço
        
        try {
          localStorage.setItem('fit_gen_hist', JSON.stringify(newHistory));
        } catch (storageError) {
          // Se falhar por cota (geralmente devido ao tamanho das imagens base64)
          console.warn("localStorage quota exceeded, pruning history...");
          // Tenta salvar apenas os 5 mais recentes ou remover a imagem do mais antigo
          localStorage.removeItem('fit_gen_hist');
          try {
            localStorage.setItem('fit_gen_hist', JSON.stringify([recipe]));
          } catch (innerError) {
            // Caso extremo: salva a receita sem a imagem se a imagem for o problema
            localStorage.setItem('fit_gen_hist', JSON.stringify([{ ...recipe, imageUrl: undefined }]));
          }
        }
      } catch (e) {
        console.error("Erro ao processar histórico no localStorage", e);
      }
      
      setView('result');
    } catch (e) {
      console.error(e);
      alert("Não conseguimos gerar sua receita agora. Verifique sua conexão ou tente mudar algumas preferências.");
      setView('form');
    }
  };

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-hidden">
      {view === 'splash' && <SplashScreen onStart={() => setView('form')} onOpenFavorites={() => setView('favs')} onOpenHistory={() => setView('hist')} />}
      
      {view === 'form' && <StepForm initialData={prefs} onCancel={() => setView('splash')} onSubmit={handleGenerate} />}
      
      {view === 'loading' && <LoadingScreen />}

      {view === 'result' && result && <ResultScreen recipe={result} onBack={() => setView('splash')} />}
      
      {view === 'favs' && <FavoritesList onSelect={(r) => { setResult(r); setView('result'); }} onBack={() => setView('splash')} />}
      
      {view === 'hist' && <HistoryList onSelect={(r) => { setResult(r); setView('result'); }} onBack={() => setView('splash')} />}
    </div>
  );
};

export default App;
