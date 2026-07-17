import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { getFirebaseAdmin } from './_firebase-admin.js';

enum DietaryFilter {
  SEM_GLUTEN = 'Sem glúten',
  SEM_LACTOSE = 'Sem lactose',
  VEGANO = 'Vegano',
  SEM_ACUCAR = 'Sem açúcar',
  SEM_RESTRICAO = 'Sem restrição'
}

interface UserPreferences {
  dietaryFilters: DietaryFilter[];
  mealType: string;
  dishType?: string;
  cookingMethod: string;
  peopleCount: number;
  calorieLevel: string;
  flavor: string;
  ingredients?: string;
  dispensableIngredients?: string;
  skillLevel: string;
}

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

      console.warn(`[Gemini Backend] tentativa ${attempt + 1} falhou por alta demanda. Tentando novamente...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

function containsForbiddenIngredients(ingredients: string[], dietaryFilters: DietaryFilter[]): boolean {
  const normalized = ingredients.map(i => i.toLowerCase().trim());

  const hasAnyTerm = (ingredient: string, terms: string[]) =>
    terms.some(term => ingredient.includes(term));

  const hasSafeGlutenFreeMarker = (ingredient: string) =>
    ingredient.includes("sem glúten") ||
    ingredient.includes("sem gluten") ||
    ingredient.includes("gluten free") ||
    ingredient.includes("gluten-free") ||
    ingredient.includes("não contém glúten") ||
    ingredient.includes("nao contem gluten");

  const hasSafeLactoseFreeMarker = (ingredient: string) =>
    ingredient.includes("sem lactose") ||
    ingredient.includes("zero lactose") ||
    ingredient.includes("lactose free") ||
    ingredient.includes("lactose-free") ||
    ingredient.includes("lacfree") ||
    ingredient.includes("sem leite") ||
    ingredient.includes("vegetal") ||
    ingredient.includes("bebida vegetal");

  const hasSafeSugarFreeMarker = (ingredient: string) =>
    ingredient.includes("sem açúcar") ||
    ingredient.includes("sem acucar") ||
    ingredient.includes("zero açúcar") ||
    ingredient.includes("zero acucar") ||
    ingredient.includes("sem adição de açúcar") ||
    ingredient.includes("sem adicao de acucar") ||
    ingredient.includes("diet");

  const hasSafeVeganMarker = (ingredient: string) =>
    ingredient.includes("vegano") ||
    ingredient.includes("vegana") ||
    ingredient.includes("vegetal");

  const glutenTerms = [
    "trigo", "farinha de trigo", "centeio", "cevada", "malte",
    "pão", "pao", "macarrão", "macarrao", "massa comum", "biscoito comum"
  ];

  const lactoseTerms = [
    "leite", "queijo", "mussarela", "muçarela", "parmesão", "parmesao",
    "requeijão", "requeijao", "manteiga", "creme de leite", "iogurte", "leite condensado"
  ];

  const veganTerms = [
    "carne", "frango", "peixe", "atum", "salmão", "salmao", "ovo", "ovos",
    "leite", "queijo", "manteiga", "iogurte", "mel"
  ];

  const sugarTerms = [
    "açúcar", "acucar", "leite condensado", "doce de leite", "chocolate ao leite",
    "achocolatado", "calda de chocolate", "xarope de açúcar", "xarope de acucar"
  ];

  const isPlantBasedMilk = (ingredient: string) =>
    ingredient.includes("leite de ") &&
    !ingredient.includes("leite de vaca");

  if (dietaryFilters.includes(DietaryFilter.SEM_GLUTEN)) {
    const hasForbiddenGluten = normalized.some(ingredient => {
      if (hasSafeGlutenFreeMarker(ingredient)) return false;
      return hasAnyTerm(ingredient, glutenTerms);
    });
    if (hasForbiddenGluten) return true;
  }

  if (dietaryFilters.includes(DietaryFilter.SEM_LACTOSE)) {
    const hasForbiddenLactose = normalized.some(ingredient => {
      if (hasSafeLactoseFreeMarker(ingredient)) return false;
      if (isPlantBasedMilk(ingredient)) return false;
      if (
        ingredient.includes("leite vegetal") ||
        ingredient.includes("bebida vegetal") ||
        ingredient.includes("queijo vegano")
      ) {
        return false;
      }
      return hasAnyTerm(ingredient, lactoseTerms);
    });
    if (hasForbiddenLactose) return true;
  }

  if (dietaryFilters.includes(DietaryFilter.VEGANO)) {
    const hasForbiddenVegan = normalized.some(ingredient => {
      if (hasSafeVeganMarker(ingredient)) return false;
      if (isPlantBasedMilk(ingredient)) return false;
      if (
        ingredient.includes("leite vegetal") ||
        ingredient.includes("bebida vegetal") ||
        ingredient.includes("queijo vegano") ||
        ingredient.includes("melado")
      ) {
        return false;
      }
      return hasAnyTerm(ingredient, veganTerms);
    });
    if (hasForbiddenVegan) return true;
  }

  if (dietaryFilters.includes(DietaryFilter.SEM_ACUCAR)) {
    const hasForbiddenSugar = normalized.some(ingredient => {
      if (hasSafeSugarFreeMarker(ingredient)) return false;
      return hasAnyTerm(ingredient, sugarTerms);
    });
    if (hasForbiddenSugar) return true;
  }

  return false;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Limitar a método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não suportado. Use POST.' });
  }

  // 2. Obter token de autorização
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autorização ausente ou malformado.' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const { auth: adminAuth, db } = getFirebaseAdmin();

    // 3. Validar token no Firebase
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(token);
    } catch (tokenErr) {
      console.error('[Auth Error] Falha ao verificar Firebase ID Token:', tokenErr);
      return res.status(401).json({ error: 'Sessão expirada ou token inválido. Faça login novamente.' });
    }

    const { uid, email } = decodedToken;
    if (!email) {
      return res.status(401).json({ error: 'Usuário não possui e-mail válido no Firebase Auth.' });
    }

    // 4. Confirmar que o usuário está na lista allowed_users (se não for admin)
    if (email.toLowerCase() !== 'arqmarcilio@gmail.com') {
      const allowedDoc = await db.collection('allowed_users').doc(email.toLowerCase()).get();
      if (!allowedDoc.exists || allowedDoc.data()?.active !== true) {
        return res.status(403).json({ error: 'Acesso restrito. Seu e-mail não possui permissão de acesso ativa.' });
      }
    }

    // 5. Controle de Abuso (Rate limit de 8 segundos por UID)
    const rateLimitRef = db.collection('user_rate_limits').doc(uid);
    const rateLimitDoc = await rateLimitRef.get();
    const now = Date.now();
    if (rateLimitDoc.exists) {
      const lastGenerated = rateLimitDoc.data()?.lastGeneratedAt;
      if (lastGenerated) {
        const lastGeneratedTime = lastGenerated.toDate ? lastGenerated.toDate().getTime() : new Date(lastGenerated).getTime();
        const diff = now - lastGeneratedTime;
        if (diff < 8000) {
          return res.status(429).json({ error: 'Por favor, aguarde alguns segundos antes de solicitar uma nova receita.' });
        }
      }
    }
    await rateLimitRef.set({ lastGeneratedAt: new Date(now) }, { merge: true });

    // 6. Validar preferências enviadas
    const prefs: UserPreferences = req.body;
    if (
      !prefs ||
      !Array.isArray(prefs.dietaryFilters) ||
      !prefs.mealType ||
      !prefs.cookingMethod ||
      typeof prefs.peopleCount !== 'number' ||
      !prefs.calorieLevel ||
      !prefs.flavor ||
      !prefs.skillLevel
    ) {
      return res.status(400).json({ error: 'Parâmetros de preferências inválidos ou ausentes.' });
    }

    // Limites de tamanho dos campos (defesa básica de payload)
    if (
      (prefs.ingredients && prefs.ingredients.length > 500) ||
      (prefs.dispensableIngredients && prefs.dispensableIngredients.length > 500) ||
      (prefs.dishType && prefs.dishType.length > 100)
    ) {
      return res.status(400).json({ error: 'O tamanho dos campos excede os limites de segurança permitidos.' });
    }

    // 7. Configuração da API Gemini (segura no servidor)
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      console.error('[Gemini Error] Variável GEMINI_API_KEY não configurada no servidor.');
      return res.status(500).json({ error: 'Erro de configuração do servidor de IA.' });
    }

    const ai = new GoogleGenAI({
      apiKey: geminiKey
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
- Se o usuário selecionar "Sem Lactose", proíba leite de vaca, queijo comum, iogurte comum, creme de leite comum, manteiga comum e derivados lácteos comuns. Bebidas vegetais são permitidas.
- Se o usuário selecionar "Vegano", proíba carnes, peixes, ovos, leite de origem animal, queijo comum, manteiga, mel e qualquer derivado animal.
- Se o usuário selecionar "Sem Açúcar", proíba açúcar comum e ingredientes claramente açucarados.
- Em caso de qualquer conflito entre sabor e segurança alimentar, a segurança alimentar tem prioridade absoluta.
- Nunca sugira substituições duvidosas para alergias/restrições severas sem deixar claro que são apenas sugestões culinárias.
- Se houver dúvida sobre um ingrediente, exclua esse ingrediente da receita.`;

    const prompt = `Gere uma receita FIT personalizada:
- Para ${prefs.peopleCount} pessoa(s).
- Momento: ${prefs.mealType} ${prefs.dishType ? `(Estilo desejado: ${prefs.dishType})` : ''}
- Forma de Cozimento: ${prefs.cookingMethod}
- Perfil Dietético: ${dietProfile}
- Meta Calórica: ${prefs.calorieLevel}
- Sabor Principal: ${prefs.flavor}
- Nível de Habilidade: ${prefs.skillLevel}
- Ingredientes para usar: ${prefs.ingredients || 'Os melhores disponíveis'}
- Ingredientes para EVITAR: ${prefs.dispensableIngredients || 'Nenhum'}

Forneça uma descrição apetitosa de no máximo 45 palavras e instruções passo a passo claras.

REGRAS DE PREPARO:
- Respeite obrigatoriamente a forma de cozimento escolhida.
- Se o usuário escolher Airfryer, use apenas Airfryer.
- Se escolher Fogão, use fogão/panela/frigideira.
- Se escolher Forno, use forno.
- Se escolher Micro-ondas, use micro-ondas.
- Se escolher Sem cozimento, gere receita sem aquecer, assar ou cozinhar.
- Se escolher Não definido, escolha o método mais adequado.
- Nunca utilize método diferente do selecionado.

REGRAS DE FORMATO:
- A descrição deve ter entre 30 e 40 palavras. Texto apetitoso e natural. Sem exageros publicitários.
- Os macronutrientes devem ser curtos.
- calories deve vir apenas no formato "350-400 kcal".
- protein deve vir apenas no formato "10-12g".
- carbs deve vir apenas no formato "35-40g".
- fats deve vir apenas no formato "18-22g".
- Nunca use palavras como "aproximadamente", "por porção", "cerca de" ou frases nos macronutrientes.

Inclua também uma estimativa de custo total dos ingredientes no Brasil.
A estimativa deve:
- considerar todos os ingredientes da receita
- usar preços médios de supermercado
- estar no formato: "R$ 15,00 - R$ 25,00"
- nunca retornar valor único, sempre intervalo`;

    // 8. Execução da chamada do Gemini
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
              "title", "description", "ingredients", "instructions",
              "macros", "estimatedTime", "estimatedCost"
            ]
          },
        },
      })
    );

    if (!response.text) {
      throw new Error("Resposta vazia do modelo Gemini");
    }

    const recipeData = JSON.parse(response.text);
    recipeData.peopleCount = prefs.peopleCount;
    recipeData.tempId = Math.random().toString(36).substring(7);

    // 9. Validação contra ingredientes proibidos
    if (containsForbiddenIngredients(recipeData.ingredients, prefs.dietaryFilters)) {
      console.warn("[Gemini Backend] Receita incompatível na primeira tentativa. Tentando gerar novamente...");
      
      const retryResponse = await withRetry(() =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `${prompt}

ATENÇÃO EXTRA:
A receita anterior continha ingrediente incompatível com as restrições selecionadas.
Refaça a receita respeitando rigorosamente todas as restrições alimentares.
Não use ingredientes proibidos nem versões comuns de ingredientes restritos.
Para sem lactose, bebidas vegetais são permitidas.
Para vegano, bebidas vegetais são permitidas.`,
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
                "title", "description", "ingredients", "instructions",
                "macros", "estimatedTime", "estimatedCost"
              ]
            },
          },
        })
      );

      if (!retryResponse.text) {
        throw new Error("Resposta vazia do modelo na segunda tentativa.");
      }

      const retryRecipeData = JSON.parse(retryResponse.text);
      
      if (containsForbiddenIngredients(retryRecipeData.ingredients, prefs.dietaryFilters)) {
        throw new Error("A receita gerada contém ingrediente incompatível com as restrições selecionadas.");
      }

      recipeData.title = retryRecipeData.title;
      recipeData.description = retryRecipeData.description;
      recipeData.ingredients = retryRecipeData.ingredients;
      recipeData.instructions = retryRecipeData.instructions;
      recipeData.estimatedCost = retryRecipeData.estimatedCost;
      recipeData.estimatedTime = retryRecipeData.estimatedTime;
      recipeData.macros = retryRecipeData.macros;
      recipeData.tempId = Math.random().toString(36).substring(7);
    }

    // 10. Chamada interna da API de Imagem do Vercel
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host;
      const baseUrl = `${protocol}://${host}`;

      console.log(`[Image API Backend] chamando geração para: ${recipeData.title}`);
      
      const imgRes = await fetch(`${baseUrl}/api/generate-recipe-image`, {
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
      });

      if (imgRes.ok) {
        const imageData = await imgRes.json();
        if (imageData.success === true && imageData.imageUrl) {
          recipeData.imageUrl = imageData.imageUrl;
        } else {
          recipeData.imageUrl = '';
        }
      } else {
        recipeData.imageUrl = '';
      }
    } catch (imgErr) {
      console.error('[Image API Backend Error] falha ao gerar imagem:', imgErr);
      recipeData.imageUrl = '';
    }

    // Retorna apenas a receita gerada com segurança
    return res.status(200).json(recipeData);

  } catch (error: any) {
    console.error('[Generate Recipe Error] Erro geral no processamento:', error);
    
    // Retorna apenas uma mensagem amigável sem expor dados internos
    const publicMessage = error.message && error.message.includes('incompatível')
      ? error.message
      : 'Não foi possível gerar a receita. Tente novamente mais tarde.';
      
    return res.status(500).json({ error: publicMessage });
  }
}
