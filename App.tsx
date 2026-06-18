
import React, { useState, useEffect } from 'react';
import { DietaryFilter, MealType, CalorieLevel, Flavor, SkillLevel, UserPreferences, RecipeResult } from './types';
import { generateRecipe } from './services/geminiService';
import { safeSaveToLocalStorage } from './services/storageService';
import SplashScreen from './components/SplashScreen';
import StepForm from './components/StepForm';
import ResultScreen from './components/ResultScreen';
import FavoritesList from './components/FavoritesList';
import HistoryList from './components/HistoryList';
import PublicHistoryList from './components/PublicHistoryList';
import AdminHistoryList from './components/AdminHistoryList';
import LoadingScreen from './components/LoadingScreen';
import LoginScreen from './components/LoginScreen';
import { Language, translations } from './translations';
import { LogOut, ShieldAlert, ChefHat, X } from 'lucide-react';
import { auth, db, googleProvider, signInWithPopup, signInWithRedirect, signOut, doc, onSnapshot, collection, addDoc, serverTimestamp, getDoc, runTransaction } from './firebase';
import { onAuthStateChanged, User, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in';
import { Capacitor } from '@capacitor/core';

const App: React.FC = () => {
const [view, setView] = useState<'splash' | 'form' | 'loading' | 'result' | 'favs' | 'hist' | 'publicHist' | 'adminHist'>('splash');
  const [language, setLanguage] = useState<Language>('pt');
  const t = translations[language];
 const [prefs, setPrefs] = useState<UserPreferences>({
  dietaryFilters: [DietaryFilter.SEM_RESTRICAO],
  mealType: MealType.ALMOCO,
  dishType: '',
  cookingMethod: 'Não definido',
  peopleCount: 1,
    calorieLevel: CalorieLevel.NAO_DEFINIDO,
    flavor: Flavor.SALGADO,
    ingredients: '',
    dispensableIngredients: '',
    skillLevel: SkillLevel.BASICA
  });
  const [result, setResult] = useState<RecipeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setIsAuthorized(false);
        setAuthLoading(false);
        setAuthError(null);
        return;
      }

      const email = currentUser.email;
      console.log(`[Auth] E-mail autenticado: ${email}`);

      if (email === 'arqmarcilio@gmail.com') {
        console.log(`[Auth] Acesso autorizado (Admin)`);
        setIsAuthorized(true);
        setAuthLoading(false);
        setAuthError(null);
        return;
      }

      if (!email) {
        handleUnauthorized();
        return;
      }

      console.log(`[Auth] Caminho consultado: allowed_users/${email}`);
      const docRef = doc(db, 'allowed_users', email);
      
      const unsubscribeDoc = onSnapshot(docRef, (docSnap) => {
        const exists = docSnap.exists();
        console.log(`[Auth] Documento existe? ${exists}`);
        
        if (exists) {
          const data = docSnap.data();
          const isActive = data?.active === true;
          console.log(`[Auth] Valor de active: ${isActive}`);
          
          if (isActive) {
            console.log(`[Auth] Acesso autorizado`);
            setIsAuthorized(true);
            setAuthLoading(false);
            setAuthError(null);
          } else {
            console.log(`[Auth] Acesso negado (active=false)`);
            handleUnauthorized('Este e-mail está inativo no sistema.');
          }
        } else {
          console.log(`[Auth] Acesso negado (documento não existe)`);
          handleUnauthorized();
        }
      }, (error) => {
        console.error("[Auth] Erro ao consultar allowed_users:", error);
        const errInfo = {
          error: error instanceof Error ? error.message : String(error),
          authInfo: {
            userId: auth.currentUser?.uid,
            email: auth.currentUser?.email,
            emailVerified: auth.currentUser?.emailVerified,
          },
          operationType: 'get',
          path: `allowed_users/${email}`
        };
        console.error('Firestore Error: ', JSON.stringify(errInfo));
        handleUnauthorized('Erro ao conectar ao servidor de autorizações.');
      });

      return () => unsubscribeDoc();
    });

    return () => unsubscribeAuth();
  }, []);

  const handleUnauthorized = (message?: string) => {
    setIsAuthorized(false);
    setAuthLoading(false);
    setAuthError(message || 'Acesso restrito. Insira seu código de convite para liberar.');
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setIsAuthorized(false);
      setAuthError(null);
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (!user || !user.email) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const dbCode = code.trim().toUpperCase();
      const codeRef = doc(db, 'access_codes', dbCode);

      // Usando transação do Firestore para garantir integridade atômica
      await runTransaction(db, async (transaction) => {
        const codeSnap = await transaction.get(codeRef);

        if (!codeSnap.exists()) {
          throw new Error('Código de convite não encontrado.');
        }

        const codeData = codeSnap.data();
        if (codeData.active !== true) {
          throw new Error('Código de convite inativo.');
        }
        if (codeData.used === true) {
          throw new Error('Este código de convite já atingiu o limite de usos.');
        }
        
        // Verificação de expiração
        if (codeData.expiresAt) {
          const expiresTime = codeData.expiresAt.toDate ? codeData.expiresAt.toDate().getTime() : new Date(codeData.expiresAt).getTime();
          if (Date.now() > expiresTime) {
            throw new Error('Este código de convite está expirado.');
          }
        }

        const isMultiUse = codeData.type === 'multi_use';

        if (isMultiUse) {
          const usedByEmails = codeData.usedByEmails || [];
          const usedByUids = codeData.usedByUids || [];
          const usedCount = codeData.usedCount || 0;
          const maxUses = codeData.maxUses || 1;

          if (usedByEmails.map((e: string) => e.toLowerCase()).includes(user.email.toLowerCase())) {
            throw new Error('Você já ativou seu acesso com este código de convite.');
          }
          if (usedByUids.includes(user.uid)) {
            throw new Error('Este usuário já utilizou este código.');
          }
          if (usedCount >= maxUses) {
            throw new Error('Este código de convite reutilizável esgotou o limite de usos.');
          }

          const newUsedCount = usedCount + 1;
          const willBeUsed = newUsedCount >= maxUses;

          // 1. Atualiza o código reutilizável
          transaction.update(codeRef, {
            usedCount: newUsedCount,
            used: willBeUsed,
            usedByEmails: [...usedByEmails, user.email],
            usedByUids: [...usedByUids, user.uid],
            lastUsedAt: serverTimestamp()
          });
        } else {
          // Lógica de uso único (single_use / padrão)
          transaction.update(codeRef, {
            used: true,
            usedByEmail: user.email,
            usedByUid: user.uid,
            usedAt: serverTimestamp()
          });
        }

        // 2. Registra o usuário em allowed_users
        const allowedRef = doc(db, 'allowed_users', user.email);
        transaction.set(allowedRef, {
          email: user.email,
          active: true,
          createdAt: serverTimestamp(),
          source: 'invite_code',
          inviteCode: dbCode,
          uid: user.uid,
          plan: codeData.plan || 'basic'
        });
      });

      console.log('[Auth] Código de convite validado e registrado com sucesso!');
    } catch (e: any) {
      console.error('[Auth] Erro ao validar convite:', e);
      setAuthError(e.message || 'Código inválido ou erro de conexão.');
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);

    try {
      if (Capacitor.isNativePlatform()) {
        console.log("[Auth] Iniciando login nativo com Google via Capacitor...");
        const result = await GoogleSignIn.signIn();
        const credential = GoogleAuthProvider.credential(
          result.authentication.idToken
        );
        await signInWithCredential(auth, credential);
      } else {
        console.log("[Auth] Iniciando login web com Google via signInWithPopup...");
        try {
          await signInWithPopup(auth, googleProvider);
        } catch (popupError: any) {
          console.warn("[Auth] signInWithPopup falhou, tentando fallback com signInWithRedirect...", popupError);
          // Caso ocorra erro de popup bloqueado, fechado pelo usuário ou não suportado, tenta redirect
          if (
            popupError.code === 'auth/popup-blocked' ||
            popupError.code === 'auth/popup-closed-by-user' ||
            popupError.code === 'auth/operation-not-supported-in-this-environment'
          ) {
            await signInWithRedirect(auth, googleProvider);
          } else {
            throw popupError;
          }
        }
      }
    } catch (error: any) {
      console.error("[Auth] Erro no login Google:", error);
      
      let friendlyMessage = "Não foi possível abrir o login do Google. Tente novamente ou verifique se pop-ups estão bloqueados.";
      if (error.code === 'auth/popup-closed-by-user') {
        friendlyMessage = "O login foi cancelado. Por favor, tente novamente.";
      } else if (error.code === 'auth/network-request-failed') {
        friendlyMessage = "Erro de conexão com a internet. Verifique sua rede e tente novamente.";
      } else if (error.message) {
        friendlyMessage = `Erro no login: ${error.message}`;
      }
      
      setAuthError(friendlyMessage);
      setAuthLoading(false);
    }
  };

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
      console.log(`[App] Chamando generateRecipe...`);
      const recipe = await generateRecipe(data);
      console.log(`[App] Receita recebida com sucesso:`, recipe.title);
      recipe.id = recipe.tempId; // Use tempId as ID for local storage
      
      setResult(recipe);
      console.log(`[App] Estado 'result' atualizado. Mudando para view 'result'.`);
      setView('result');
      
      // Save to history
      console.log(`[App] Salvando no histórico...`);
      const historyStr = localStorage.getItem('fit_gen_hist');
      let history = historyStr ? JSON.parse(historyStr) : [];
      const newHistory = [recipe, ...history].slice(0, 20);
      safeSaveToLocalStorage('fit_gen_hist', newHistory, 20);
      console.log(`[App] Histórico salvo.`);

      // Save to public history in Firestore
      try {
      await addDoc(collection(db, 'public_recipes'), {
  ...recipe,
  createdAt: serverTimestamp(),
  authorId: user?.uid,
  authorEmail: user?.email,
  authorName: user?.displayName || user?.email || 'Usuário'
});
        console.log(`[App] Receita salva no histórico público.`);
      } catch (err) {
        console.error("[App] Erro ao salvar no histórico público:", err);
      }
      
    } catch (e: any) {
      console.error(`[App] Erro na geração:`, e);
      setError(e.message || t.errorGeneric);
      setView('form');
    }
  };

  if (authLoading) {
    return <LoginScreen language={language} onLogin={handleLogin} error={null} isLoading={true} />;
  }

  if (!user) {
    return (
      <LoginScreen 
        language={language} 
        onLogin={handleLogin} 
        error={authError} 
        isLoading={false} 
        showInviteCode={false} 
      />
    );
  }

  if (!isAuthorized) {
    return (
      <LoginScreen 
        language={language} 
        onLogin={handleLogin} 
        error={authError} 
        isLoading={false} 
        showInviteCode={true} 
        userEmail={user.email} 
        onVerifyCode={handleVerifyCode} 
        onCancel={handleLogout} 
      />
    );
  }

  return (
    <div className="max-w-xl mx-auto min-h-screen bg-white relative font-sans selection:bg-emerald-100">
     {/* Header with Logout */}
<div className="absolute top-6 right-6 z-50 flex flex-col items-end gap-2">

  <button 
    onClick={() => signOut(auth)}
    className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-500 rounded-full transition-all group"
    title={t.signOut}
  >
    <span className="text-[10px] font-black uppercase tracking-widest">{t.signOut}</span>
    <LogOut className="w-4 h-4" />
  </button>

  {user?.email === 'arqmarcilio@gmail.com' && (
    <button
      onClick={() => setView('adminHist')}
      className="px-4 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase tracking-widest"
    >
      Admin
    </button>
  )}

</div>

      {view === 'splash' && (
        <SplashScreen 
          language={language} 
          onLanguageChange={setLanguage} 
          onStart={() => setView('form')} 
          onOpenFavorites={() => setView('favs')} 
          onOpenHistory={() => setView('hist')} 
          onOpenPublicHistory={() => setView('publicHist')}
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
      
      {view === 'publicHist' && (
        <PublicHistoryList 
          language={language} 
          onSelect={(r) => { setResult(r); setView('result'); }} 
          onBack={() => setView('splash')} 
        />
      )}
      {view === 'adminHist' && user?.email === 'arqmarcilio@gmail.com' && (
  <AdminHistoryList
    language={language}
    onBack={() => setView('splash')}
    onSelect={(r) => { setResult(r); setView('result'); }}
  />
)}
    </div>
  );
};

export default App;
