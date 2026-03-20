
import React, { useState, useEffect } from 'react';
import { DietaryFilter, MealType, CalorieLevel, Flavor, SkillLevel, UserPreferences, RecipeResult } from './types';
import { generateRecipe } from './services/geminiService';
import SplashScreen from './components/SplashScreen';
import StepForm from './components/StepForm';
import ResultScreen from './components/ResultScreen';
import FavoritesList from './components/FavoritesList';
import HistoryList from './components/HistoryList';
import LoadingScreen from './components/LoadingScreen';
import { auth, db, googleProvider, signInWithPopup, signOut, doc, onSnapshot, storage, ref, uploadString, getDownloadURL } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { LogOut, ShieldAlert } from 'lucide-react';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string | null>(null);
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
    const userEmail = user.email; // Busca exatamente o e-mail autenticado
    if (userEmail.toLowerCase() === "arqmarcilio@gmail.com") {
      setIsAuthorized(true);
      setAuthLoading(false);
      return;
    }

    const userDocRef = doc(db, 'allowed_users', userEmail);
    
    console.log("[Auth] E-mail autenticado:", userEmail);
    console.log("[Auth] Caminho do documento consultado:", userDocRef.path);

    const unsubscribeSnapshot = onSnapshot(userDocRef, (snapshot) => {
      console.log("[Auth] Documento existe?", snapshot.exists() ? "SIM" : "NÃO");
      
      if (snapshot.exists()) {
        const data = snapshot.data();
        console.log("[Auth] Valor de active:", data.active);
        
        if (data.active === true) {
          setIsAuthorized(true);
          setUnauthorizedEmail(null);
        } else {
          setIsAuthorized(false);
          setUnauthorizedEmail(userEmail);
          signOut(auth); // Desloga imediatamente
        }
      } else {
        setIsAuthorized(false);
        setUnauthorizedEmail(userEmail);
        signOut(auth); // Desloga imediatamente
      }
      setAuthLoading(false);
    }, (error) => {
      console.error("[Auth] Erro ao verificar autorização:", error);
      handleFirestoreError(error, OperationType.GET, `allowed_users/${userEmail}`);
      setIsAuthorized(false);
      setUnauthorizedEmail(userEmail);
      signOut(auth);
      setAuthLoading(false);
    });

    return () => unsubscribeSnapshot();
  }, [user, retryCount]);

  const handleLogin = async () => {
    setAuthLoading(true);
    setIsAuthorized(null);
    setUnauthorizedEmail(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro no login:", error);
      alert("Erro ao fazer login com Google.");
      setAuthLoading(false);
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
      
      // Mostra o resultado imediatamente com a imagem base64 (não bloqueia a UI)
      setResult(recipe);
      setView('result');

      // Faz o upload para o Firebase Storage em segundo plano para ter uma URL pública
      if (recipe.imageUrl && recipe.imageUrl.startsWith('data:')) {
        // Não usamos await aqui para não travar a tela de carregamento
        (async () => {
          try {
            const fileName = `recipes/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            const storageRef = ref(storage, fileName);
            await uploadString(storageRef, recipe.imageUrl!, 'data_url');
            const downloadUrl = await getDownloadURL(storageRef);
            
            // Atualiza o estado com a nova URL pública para o compartilhamento funcionar melhor
            recipe.imageUrl = downloadUrl;
            setResult({ ...recipe });
            console.log("[Storage] Imagem enviada com sucesso:", downloadUrl);
          } catch (storageErr) {
            console.error("[Storage] Erro ao enviar imagem (fallback para base64):", storageErr);
          }
        })();
      }
      
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
  if (!user || isAuthorized === false || unauthorizedEmail) {
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-emerald-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Acesso Restrito</h1>
          
          {unauthorizedEmail ? (
            <div className="mb-8">
              <p className="text-red-500 font-medium mb-4">Acesso não autorizado para este e-mail.</p>
              <p className="text-slate-500 text-sm mb-4">Entre em contato com o administrador para solicitar acesso.</p>
              <p className="text-slate-400 text-xs italic">Email: {unauthorizedEmail}</p>
            </div>
          ) : (
            <p className="text-slate-500 mb-8">Faça login para acessar o gerador de receitas saudáveis.</p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setAuthLoading(true);
                setRetryCount(prev => prev + 1);
              }}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-3"
            >
              Tentar Novamente
            </button>

            <button
              onClick={handleLogin}
              className="w-full py-4 bg-white border-2 border-emerald-500 text-emerald-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-3"
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
