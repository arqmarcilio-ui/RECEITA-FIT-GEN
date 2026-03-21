
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
    try {
      const seed = Math.floor(Math.random() * 1000);
      const imagePrompt = `Realistic food photography of ${recipeData.title}, high quality food photo, professional food styling, top view or restaurant presentation, detailed texture, 4k, appetizing, natural colors. No abstract art, no conceptual images, only real food and ingredients. Style #${seed}`;
      
      console.log(`[Image Prompt] ${imagePrompt}`);
      console.log(`[Gemini] Iniciando geração de imagem para: "${recipeData.title}"...`);
      
      const imgResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: imagePrompt,
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      const part = imgResponse.candidates?.[0]?.content?.parts.find(p => p.inlineData);
      if (part?.inlineData) {
        const base64 = part.inlineData.data;
        console.log(`[Gemini] Imagem gerada com sucesso. Base64 (início): ${base64.substring(0, 30)}...`);
        recipeData.imageUrl = `data:image/png;base64,${base64}`;
      } else {
        throw new Error("Nenhuma imagem retornada no payload");
      }
    } catch (e) {
      console.warn(`[Gemini] Falha na geração da imagem para "${recipeData.title}", usando fallback de comida.`, e);
      // Fallback único baseado no título com palavra-chave 'food' para garantir relevância
      recipeData.imageUrl = `https://picsum.photos/seed/${encodeURIComponent(recipeData.title + ' healthy food')}/800/800`;
    }

    return recipeData;
  } catch (error) {
    console.error("Erro na geração da receita:", error);
    throw error;
  }
};
