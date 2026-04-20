import { GoogleGenAI, Type } from "@google/genai";
import { UserPreferences, RecipeResult, DietaryFilter } from "../types";

async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 2500): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      const message = String(error?.message || "");
      const is503 =
        message.includes('"code":503') ||
        message.includes("503") ||
        message.includes("UNAVAILABLE") ||
        message.includes("high demand");

      if (!is503 || attempt === retries - 1) {
        throw error;
      }

      console.warn(`[Gemini] tentativa ${attempt + 1} falhou por alta demanda. Tentando novamente...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

function containsForbiddenIngredients(ingredients: string[], dietaryFilters: DietaryFilter[]): boolean {
  const normalized = ingredients.map(i => i.toLowerCase());

  const glutenTerms = [
    "trigo",
    "farinha de trigo",
    "centeio",
    "cevada",
    "malte",
    "pão",
    "macarrão",
    "massa comum",
    "biscoito comum"
  ];

  const lactoseTerms = [
    "leite",
    "queijo",
    "mussarela",
    "parmesão",
    "requeijão",
    "manteiga",
    "creme de leite",
    "iogurte",
    "leite condensado"
  ];

  const veganTerms = [
    "carne",
    "frango",
    "peixe",
    "atum",
    "salmão",
    "ovo",
    "ovos",
    "leite",
    "queijo",
    "manteiga",
    "iogurte",
    "mel"
  ];

  const sugarTerms = [
    "açúcar",
    "acucar",
    "leite condensado",
    "doce de leite",
    "chocolate ao leite",
    "achocolatado"
  ];

  const hasAny = (terms: string[]) =>
    normalized.some(ingredient => terms.some(term => ingredient.includes(term)));

  if (dietaryFilters.includes(DietaryFilter.SEM_GLUTEN) && hasAny(glutenTerms)) {
    return true;
  }

  if (dietaryFilters.includes(DietaryFilter.SEM_LACTOSE) && hasAny(lactoseTerms)) {
    return true;
  }

  if (dietaryFilters.includes(DietaryFilter.VEGANO) && hasAny(veganTerms)) {
    return true;
  }

  if (dietaryFilters.includes(DietaryFilter.SEM_ACUCAR) && hasAny(sugarTerms)) {
    return true;
  }

  return false;
}

export const generateRecipe = async (prefs: UserPreferences): Promise<RecipeResult> => {
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY || process.env.API_KEY || ''
  });

  const dietProfile = prefs.dietaryFilters.length > 0
    ? prefs.dietaryFilters.join(', ')
    : DietaryFilter.SEM_RESTRICAO;

  const systemInstruction = `Você é um nutricionista sênior e chef de cozinha renomado especializado em culinária saudável e funcional (FIT).
Sua missão é criar receitas nutricionalmente coerentes, seguras, fáceis de preparar e saborosas.

REGRAS CRÍTICAS:
1. O sabor deve ser estritamente o solicitado.
2. Respeite TODAS as restrições dietéticas selecionadas.
3. O custo deve ser realista para o mercado brasileiro atual (R$).
4. A estimativa de custo deve ser obrigatoriamente uma faixa de preço em reais, no formato: "R$ 15,00 - R$ 25,00".
5. Nunca retorne um valor único. Sempre utilize intervalo de preço.
6. Retorne APENAS o JSON válido seguindo o esquema.

REGRAS DE SEGURANÇA ALIMENTAR:
- Se o usuário selecionar "Sem Glúten", proíba trigo, centeio, cevada, malte e derivados. Em caso de dúvida, não use o ingrediente.
- Se o usuário selecionar "Sem Lactose", proíba leite, queijo comum, iogurte comum, creme de leite comum, manteiga comum e derivados lácteos comuns. Em caso de dúvida, não use o ingrediente.
- Se o usuário selecionar "Vegano", proíba carnes, peixes, ovos, leite, queijo, manteiga, mel e qualquer derivado animal.
- Se o usuário selecionar "Sem Açúcar", proíba açúcar comum e ingredientes claramente açucarados.
- Em caso de qualquer conflito entre sabor e segurança alimentar, a segurança alimentar tem prioridade absoluta.
- Nunca sugira substituições duvidosas para alergias/restrições severas sem deixar claro que são apenas sugestões culinárias.
- Se houver dúvida sobre um ingrediente, exclua esse ingrediente da receita.`;

  const prompt = `Gere uma receita FIT personalizada:
- Para ${prefs.peopleCount} pessoa(s).
- Momento: ${prefs.mealType} ${prefs.dishType ? `(Estilo desejado: ${prefs.dishType})` : ''}
- Perfil Dietético: ${dietProfile}
- Meta Calórica: ${prefs.calorieLevel}
- Sabor Principal: ${prefs.flavor}
- Nível de Habilidade: ${prefs.skillLevel}
- Ingredientes para usar: ${prefs.ingredients || 'Os melhores disponíveis'}
- Ingredientes para EVITAR: ${prefs.dispensableIngredients || 'Nenhum'}

Forneça uma descrição apetitosa e instruções passo a passo claras.

Inclua também uma estimativa de custo total dos ingredientes no Brasil.
A estimativa deve:
- considerar todos os ingredientes da receita
- usar preços médios de supermercado
- estar no formato: "R$ 15,00 - R$ 25,00"
- nunca retornar valor único, sempre intervalo`;

  try {
    const response = await withRetry(() =>
      ai.models.generateContent({
        model: "gemini-2.5-flash",
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
              estimatedCost: { type: Type.STRING },
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
            required: [
              "title",
              "description",
              "ingredients",
              "instructions",
              "macros",
              "estimatedTime",
              "estimatedCost"
            ]
          },
        },
      })
    );

    if (!response.text) throw new Error("Resposta vazia do modelo");

    console.log(`[Gemini] Texto bruto da resposta:`, response.text);

    const recipeData = JSON.parse(response.text) as RecipeResult;
    recipeData.tempId = Math.random().toString(36).substring(7);

    if (containsForbiddenIngredients(recipeData.ingredients, prefs.dietaryFilters)) {
      throw new Error("A receita gerada contém ingrediente incompatível com as restrições selecionadas.");
    }

    console.log(`[Gemini] Receita gerada: "${recipeData.title}" (tempId: ${recipeData.tempId})`);

    try {
      console.log(`[Image API] chamando geração para: ${recipeData.title}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

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

      if (imageData.success === true && imageData.imageUrl) {
        console.log(`[Image API] imagem REAL recebida`);
        recipeData.imageUrl = imageData.imageUrl;
      } else {
        console.warn(`[Image API] falha real na geração:`, imageData.error);
        recipeData.imageUrl = '';
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.error(`[Image API] timeout após 120s`);
      } else {
        console.error(`[Image API] erro:`, e);
      }
      recipeData.imageUrl = '';
    }

    return recipeData;
  } catch (error) {
    console.error("Erro na geração da receita:", error);
    throw error;
  }
};
