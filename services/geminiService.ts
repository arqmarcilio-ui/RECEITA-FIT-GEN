import { UserPreferences, RecipeResult } from "../types";
import { auth } from "../firebase";

export const generateRecipe = async (prefs: UserPreferences): Promise<RecipeResult> => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("Usuário não autenticado. Faça login para gerar uma receita.");
    }

    // 1. Obter o Firebase ID Token do usuário atual
    const token = await currentUser.getIdToken();

    console.log("[Gemini Client] Enviando solicitação de geração de receita ao servidor...");
    
    // 2. Fazer requisição HTTP POST para o endpoint serverless
    const response = await fetch('/api/generate-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(prefs)
    });

    // 3. Tratar retornos de status HTTP
    if (!response.ok) {
      let errorMessage = 'Não foi possível gerar a receita. Tente novamente.';
      try {
        const errorData = await response.json();
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (jsonErr) {
        // Ignora erro se a resposta não for JSON
      }

      if (response.status === 400) {
        throw new Error(errorMessage || 'Dados enviados inválidos.');
      } else if (response.status === 401) {
        throw new Error('Sessão expirada ou login necessário. Por favor, reconecte sua conta.');
      } else if (response.status === 403) {
        throw new Error('Acesso não autorizado. Seu e-mail não possui permissão ativa.');
      } else if (response.status === 429) {
        throw new Error(errorMessage || 'Limite temporário atingido. Aguarde alguns segundos antes de tentar novamente.');
      } else {
        throw new Error(errorMessage);
      }
    }

    const recipeData = await response.json() as RecipeResult;
    return recipeData;

  } catch (error: any) {
    console.error("[Gemini Client Error] Falha na geração da receita:", error);
    throw error;
  }
};
