
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
import { auth, db, googleProvider, signInWithPopup, signOut, doc, onSnapshot, getDocFromServer, storage, ref, uploadString, getDownloadURL, collection, addDoc, serverTimestamp } from './firebase';
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
  const [language, setLanguage] = useState<Language>('pt');
  const t = translations[language];
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
  const [error, setError] = useState<string | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Monitora estado de autenticação
  useEffect(() => {
    console.log("[Auth] Iniciando monitoramento de autenticação");
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      console.log("[Auth] Estado de autenticação alterado:", currentUser ? `Usuário logado: ${currentUser.email}` : "Nenhum usuário logado");
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
    if (!user?.email) {
      console.log("[Auth] Sem e-mail de usuário, aguardando...");
      return;
    }

    console.log("[Auth] Verificando autorização para:", user.email);
    // O administrador sempre tem acesso
    const userEmail = user.email; 
    if (userEmail && userEmail.toLowerCase() === "arqmarcilio@gmail.com") {
      console.log("[Auth] Administrador detectado, autorizando automaticamente.");
      setIsAuthorized(true);
      setAuthLoading(false);
      return;
    }

    if (!userEmail) {
      setIsAuthorized(false);
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

  useEffect(() => {
    const checkDeepLink = async () => {
      const params = new URLSearchParams(window.location.search);
      const recipeId = params.get('id');
      
      if (recipeId) {
        setView('loading');
        try {
          const docRef = doc(db, 'recipes', recipeId);
          const docSnap = await getDocFromServer(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data() as RecipeResult;
            setResult({ ...data, id: docSnap.id });
            setView('result');
          } else {
            console.error("Receita não encontrada");
            setView('splash');
          }
        } catch (err) {
          console.error("Erro ao buscar deep link:", err);
          setView('splash');
        }
      }
    };

    if (isAuthorized) {
      checkDeepLink();
    }
  }, [isAuthorized]);

  const handleLogin = async () => {
    setAuthLoading(true);
    setIsAuthorized(null);
    setUnauthorizedEmail(null);
    try {
      console.log("[Auth] Iniciando login com Google...");
      await signInWithPopup(auth, googleProvider);
      console.log("[Auth] Login com Google concluído.");
    } catch (error: any) {
      console.error("Erro no login:", error);
      setLoginError(`Erro ao fazer login: ${error.message || "Tente novamente."}`);
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
    if (!isAuthorized || !user) return;
    
    const currentGenerationId = Math.random().toString(36).substring(7);
    console.log(`[App] Iniciando geração de receita #${currentGenerationId} para: "${data.flavor}"...`);
    
    setPrefs(data);
    setView('loading');
    setError(null);
    try {
      const recipe = await generateRecipe(data);
      console.log(`[App] Receita recebida da IA: "${recipe.title}"`);
      
      // Mostra o resultado imediatamente com a imagem base64 (não bloqueia a UI)
      setResult(recipe);
      setView('result');

      // Faz o upload para o Firebase Storage em segundo plano para ter uma URL pública
      // E salva no Firestore para persistência e visibilidade no console
      (async () => {
        try {
          let finalImageUrl = recipe.imageUrl;

          if (recipe.imageUrl && recipe.imageUrl.startsWith('data:')) {
            const fileName = `recipes/${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
            const storageRef = ref(storage, fileName);
            console.log(`[Storage] Iniciando upload para: ${fileName} (Receita: "${recipe.title}")`);
            
            await uploadString(storageRef, recipe.imageUrl!, 'data_url');
            finalImageUrl = await getDownloadURL(storageRef);
            console.log(`[Storage] Upload concluído. URL final: ${finalImageUrl}`);
            
            // Atualiza o estado com a nova URL pública apenas se ainda for a receita atual (pelo tempId)
            recipe.imageUrl = finalImageUrl;
            setResult(prev => (prev && prev.tempId === recipe.tempId ? { ...recipe } : prev));
          }

          // Prepara os dados para o Firestore, removendo a imagem base64 se já tivermos a URL final
          const { imageUrl: _, tempId: __, ...recipeData } = recipe;

          // Salva no Firestore para aparecer no console do Firebase e ser persistente
          console.log(`[Firestore] Salvando receita: "${recipe.title}"...`);
          const docRef = await addDoc(collection(db, 'recipes'), {
            ...recipeData,
            userId: user.uid,
            createdAt: serverTimestamp(),
            imageUrl: finalImageUrl,
            isFavorite: false
          });
          
          // Atualiza o ID localmente apenas se ainda for a receita atual
          recipe.id = docRef.id;
          setResult(prev => (prev && prev.tempId === recipe.tempId ? { ...recipe } : prev));
          console.log(`[Firestore] Receita salva com sucesso. ID: ${docRef.id} (Título: "${recipe.title}")`);

        } catch (err) {
          console.error("[Firebase] Erro ao processar persistência:", err);
        }
      })();
      
      // Armazenamento local como backup rápido
      const historyStr = localStorage.getItem('fit_gen_hist');
      let history = historyStr ? JSON.parse(historyStr) : [];
      const newHistory = [recipe, ...history];
      safeSaveToLocalStorage('fit_gen_hist', newHistory, 20);
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Não conseguimos gerar sua receita agora. Verifique sua conexão ou tente mudar algumas preferências.");
      setView('form');
    }
  };

  // Tela de carregamento inicial do Firebase
  if (authLoading && user) {
    return <LoadingScreen language={language} />;
  }

  // Se não estiver logado ou não autorizado
  if (!user || isAuthorized !== true) {
    return (
      <div className="max-w-xl mx-auto min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-10 h-10 text-emerald-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            {!user ? t.welcome : t.restrictedAccess}
          </h1>
          
          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl text-sm font-bold flex items-center gap-3 mb-4">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}
          
          {user && unauthorizedEmail ? (
            <div className="mb-8">
              <p className="text-red-500 font-medium mb-4">{t.unauthorizedEmail}</p>
              <p className="text-slate-500 text-sm mb-4">{t.contactAdmin}</p>
              <p className="text-slate-400 text-xs italic">Email: {unauthorizedEmail}</p>
            </div>
          ) : (
            <p className="text-slate-500 mb-8">
              {!user 
                ? t.loginToAccess 
                : t.verifyingAuth}
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setAuthLoading(true);
                setRetryCount(prev => prev + 1);
              }}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200 flex items-center justify-center gap-3"
            >
              {t.tryAgain}
            </button>

            <button
              onClick={handleLogin}
              className="w-full py-4 bg-white border-2 border-emerald-500 text-emerald-600 rounded-2xl font-bold transition-all flex items-center justify-center gap-3"
            >
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
              {user ? t.changeAccount : t.signInWithGoogle}
            </button>

            {user && (
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-medium transition-all flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                {t.signOut}
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

      {view === 'splash' && <SplashScreen language={language} onLanguageChange={setLanguage} onStart={() => setView('form')} onOpenFavorites={() => setView('favs')} onOpenHistory={() => setView('hist')} />}
      
      {view === 'form' && (
        <div className="relative h-full">
          {error && (
            <div className="absolute top-4 left-4 right-4 z-50 bg-red-50 border-2 border-red-200 p-4 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4">
              <ShieldAlert className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-800 font-bold text-sm">{t.errorTitle}</p>
                <p className="text-red-600 text-[10px]">{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <StepForm initialData={prefs} language={language} onCancel={() => setView('splash')} onSubmit={handleGenerate} />
        </div>
      )}
      
      {view === 'loading' && <LoadingScreen language={language} />}

      {view === 'result' && result && <ResultScreen recipe={result} language={language} onBack={() => setView('splash')} />}
      
      {view === 'favs' && <FavoritesList language={language} onSelect={(r) => { setResult(r); setView('result'); }} onBack={() => setView('splash')} />}
      
      {view === 'hist' && <HistoryList language={language} onSelect={(r) => { setResult(r); setView('result'); }} onBack={() => setView('splash')} />}
    </div>
  );
};

export default App;
