
import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, RecipeResult, DietaryFilter } from "../types";

export const generateRecipe = async (prefs: UserPreferences): Promise<RecipeResult> => {
  // Use process.env.API_KEY directly as required
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
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
    
    const recipeData = JSON.parse(response.text) as RecipeResult;
    recipeData.tempId = Math.random().toString(36).substring(7);
    console.log(`[Gemini] Receita gerada: "${recipeData.title}" (tempId: ${recipeData.tempId})`);

    // Gerar imagem do prato com contexto mais rico e realista
    const FOOD_PLACEHOLDER = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=1000&auto=format&fit=crop";
    
    const generateImage = async (attempt: number): Promise<string | null> => {
      try {
        const seed = Math.floor(Math.random() * 1000);
        const imagePrompt = `Realistic food photography of ${recipeData.title}, high quality food photo, professional food styling, top view or restaurant presentation, detailed texture, 4k, appetizing, natural colors. No abstract art, no conceptual images, only real food and ingredients. Style #${seed}`;
        
        if (attempt > 1) {
          console.log(`[Image Retry] tentativa ${attempt}`);
        }
        console.log(`[Image Prompt] ${imagePrompt}`);
        
        const imgResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash-image',
          contents: imagePrompt,
          config: { imageConfig: { aspectRatio: "1:1" } }
        });
        
        const part = imgResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
        if (part?.inlineData) {
          console.log(`[Image Generation] sucesso`);
          return `data:image/png;base64,${part.inlineData.data}`;
        }
        return null;
      } catch (e) {
        console.warn(`[Gemini] Erro na tentativa ${attempt} de gerar imagem:`, e);
        return null;
      }
    };

    let finalImageUrl = await generateImage(1);
    
    // Retry logic (max 2 attempts total)
    if (!finalImageUrl) {
      finalImageUrl = await generateImage(2);
    }

    if (finalImageUrl) {
      recipeData.imageUrl = finalImageUrl;
    } else {
      console.log(`[Image Fallback] usando placeholder fixo`);
      recipeData.imageUrl = FOOD_PLACEHOLDER;
    }

    return recipeData;
  } catch (error) {
    console.error("Erro na geração da receita:", error);
    throw error;
  }
};
