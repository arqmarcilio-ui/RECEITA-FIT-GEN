
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

    // Gerar imagem do prato com contexto mais rico
    try {
      const imgResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: `Food photography, high-end restaurant plating: ${recipeData.title}. Healthy ingredients visible, bright natural lighting, macro shot, blurred background, 4k high resolution. No text or logos.`,
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      const part = imgResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        recipeData.imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      }
    } catch (e) {
      console.warn("Image generation failed, using fallback", e);
      recipeData.imageUrl = "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&q=80&w=800";
    }

    return recipeData;
  } catch (error) {
    console.error("Erro na geração da receita:", error);
    throw error;
  }
};
