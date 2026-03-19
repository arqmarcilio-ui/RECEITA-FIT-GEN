
import React, { useState, useEffect } from 'react';
import { DietaryFilter, MealType, CalorieLevel, Flavor, SkillLevel, UserPreferences, RecipeResult } from './types';
import { generateRecipe } from './services/geminiService';
import SplashScreen from './components/SplashScreen';
import StepForm from './components/StepForm';
import ResultScreen from './components/ResultScreen';
import FavoritesList from './components/FavoritesList';
import HistoryList from './components/HistoryList';
import LoadingScreen from './components/LoadingScreen';
import { auth, db, googleProvider, signInWithPopup, signOut, doc, onSnapshot } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { LogOut, ShieldAlert } from 'lucide-react';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
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

  // Monitora estado de autenticação
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAuthorized(null);
        setAuthLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Monitora autorização em tempo real no Firestore
  useEffect(() => {
    if (!user?.email) return;

    // O administrador sempre tem acesso
    const userEmail = user.email.toLowerCase();
    if (userEmail === "arqmarcilio@gmail.com") {
      setIsAuthorized(true);
      setAuthLoading(false);
      return;
    }

    const userDocRef = doc(db, 'allowed_users', userEmail);
    const unsubscribeSnapshot = onSnapshot(userDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.active === true) {
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } else {
        setIsAuthorized(false);
      }
      setAuthLoading(false);
    }, (error) => {
      console.error("Erro ao verificar autorização:", error);
      setIsAuthorized(false);
      setAuthLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao fazer login com Google.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsAuthorized(null);
      setView('splash');
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  };

  const handleGenerate = async (data: UserPreferences) => {
    if (!isAuthorized) return;
    
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

  // Tela de carregamento inicial do Firebase
  if (authLoading && user) {
    return <LoadingScreen />;
  }

  // Se não estiver logado ou não autorizado
  if (!user || isAuthorized === false) {
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-emerald-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Acesso Restrito</h1>
          
          {isAuthorized === false ? (
            <div className="mb-8">
              <p className="text-red-500 font-medium mb-4">Acesso não autorizado para este e-mail.</p>
              <p className="text-slate-500 text-sm mb-4">Entre em contato com o administrador para solicitar acesso.</p>
              <p className="text-slate-400 text-xs italic">Email: {user?.email}</p>
            </div>
          ) : (
            <p className="text-slate-500 mb-8">Faça login para acessar o gerador de receitas saudáveis.</p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={handleLogin}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
              {user ? 'Trocar de Conta' : 'Entrar com Google'}
            </button>

            {user && (
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sair
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-slate-50 relative shadow-2xl overflow-hidden">
      {/* Botão de Logout Visível */}
      <button 
        onClick={handleLogout}
        className="absolute top-4 right-4 z-50 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-md text-slate-600 hover:text-red-500 transition-colors"
        title="Sair"
      >
        <LogOut className="w-5 h-5" />
      </button>

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
