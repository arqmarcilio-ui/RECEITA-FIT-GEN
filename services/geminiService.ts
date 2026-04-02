
import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, RecipeResult, DietaryFilter } from "../types";

export const generateRecipe = async (prefs: UserPreferences): Promise<RecipeResult> => {
  // Use process.env.GEMINI_API_KEY directly as required
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || '' });
  
  const systemInstruction = `Você é um nutricionista sênior e chef de cozinha renomado especializado em culinária saudável e funcional (FIT). 
  Sua missão é criar receitas que sejam nutricionalmente densas, fáceis de preparar e deliciosas.
  REGRAS CRÍTICAS:
  1. O sabor deve ser estritamente o solicitado.
  2. Respeite TODAS as restrições dietéticas selecionadas. Se o perfil for 'Sem Restrição' ou vazio, sinta-se livre para usar ingredientes saudáveis variados.
  3. O custo deve ser realista para o mercado brasileiro atual (R$).
  4. Retorne APENAS o JSON válido seguindo o esquema.`;

  // Define o perfil dietético: se vazio, assume 'Sem Restrição'
  const dietProfile = prefs.dietaryFilters.length > 0 
    ? prefs.dietaryFilters.join(', ') 
    : DietaryFilter.SEM_RESTRICAO;

  const prompt = `Gere uma receita FIT personalizada:
  - Para ${prefs.peopleCount} pessoa(s).
  - Momento: ${prefs.mealType} ${prefs.dishType ? `(Estilo desejado: ${prefs.dishType})` : ''}
  - Perfil Dietético: ${dietProfile}
  - Meta Calórica: ${prefs.calorieLevel}
  - Sabor Principal: ${prefs.flavor}
  - Nível de Habilidade: ${prefs.skillLevel}
  - Ingredientes para usar: ${prefs.ingredients || 'Os melhores disponíveis'}
  - Ingredientes para EVITAR: ${prefs.dispensableIngredients || 'Nenhum'}

  Forneça uma descrição apetitosa e instruções passo a passo claras.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            estimatedCost: { 
              type: Type.STRING, 
              description: "Ex: R$ 30,00 - R$ 45,00" 
            },
            estimatedTime: { type: Type.STRING },
            macros: {
              type: Type.OBJECT,
              properties: {
                protein: { type: Type.STRING },
                carbs: { type: Type.STRING },
                fats: { type: Type.STRING },
                calories: { type: Type.STRING },
              },
              required: ["protein", "carbs", "fats", "calories"]
            }
          },
          required: ["title", "description", "ingredients", "instructions", "macros", "estimatedTime", "estimatedCost"]
        },
      },
    });

    if (!response.text) throw new Error("Resposta vazia do modelo");
    
    console.log(`[Gemini] Texto bruto da resposta:`, response.text);
    const recipeData = JSON.parse(response.text) as RecipeResult;
    recipeData.tempId = Math.random().toString(36).substring(7);
    console.log(`[Gemini] Receita gerada: "${recipeData.title}" (tempId: ${recipeData.tempId})`);

    // Gerar imagem do prato via OpenAI (backend)
    const getFallbackImage = (title: string) =>
  `https://picsum.photos/seed/${encodeURIComponent(title)}-${Date.now()}/1000/600`;
    
    try {
      console.log(`[Image API] chamando geração para: ${recipeData.title}`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 seconds timeout

      const imageResponse = await fetch('/api/generate-recipe-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: recipeData.title,
          description: recipeData.description,
          ingredients: recipeData.ingredients.join(', '),
          recipeId: recipeData.tempId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!imageResponse.ok) {
        throw new Error(`Erro HTTP: ${imageResponse.status}`);
      }

      const imageData = await imageResponse.json();
      
    if (imageData.imageUrl) {
  console.log(`[Image API] resposta recebida: ${imageData.imageUrl}`);
  recipeData.imageUrl = imageData.imageUrl;
} else {
  console.warn(`[Image API] Nenhuma imagem retornada pela API.`);
  recipeData.imageUrl = getFallbackImage(recipeData.title);
}
    } catch (e: any) {
     if (e.name === 'AbortError') {
  console.error(`[Image API] timeout na geração da imagem após 120s.`);
} else {
  console.error(`[Image API] erro na geração:`, e);
}
recipeData.imageUrl = '';

    return recipeData;
  } catch (error) {
    console.error("Erro na geração da receita:", error);
    throw error;
  }
};
