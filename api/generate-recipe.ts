import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";
import { getFirebaseAdmin } from './_firebase-admin.js';

enum DietaryFilter {
  SEM_RESTRICAO = 'Sem Restrição',
  VEGANO = 'Vegano',
  VEGETARIANA = 'Vegetariano',
  LOW_CARB = 'Low Carb',
  SEM_LACTOSE = 'Sem Lactose',
  SEM_GLUTEN = 'Sem Glúten',
  SEM_ACUCAR = 'Sem Açúcar'
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

interface ValidationResult {
  forbidden: boolean;
  rule?: string;
  term?: string;
  offendingIngredient?: string;
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

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function hasFilter(dietaryFilters: (string | DietaryFilter)[], target: string): boolean {
  if (!Array.isArray(dietaryFilters)) return false;
  const normTarget = normalizeText(target);
  return dietaryFilters.some(f => normalizeText(String(f)).includes(normTarget));
}

// Marcadores seguros globais que indicam versões 100% vegetais/veganas
const safeVeganGlobal = [
  'vegano', 'vegana', 'veganos', 'veganas',
  'vegetal', 'vegetais',
  'plant-based', 'plant based',
  '100% vegetal', 'origem vegetal',
  'tofu', 'tempeh', 'seitan'
];

// Substitutos vegetais populares na culinária vegana
const safePlantSubstitutes = [
  'leite de coco', 'leite de amendoa', 'leite de amendoas', 'leite de aveia', 'leite de soja',
  'leite de castanha', 'leite de castanhas', 'leite de arroz', 'leite de gergelim',
  'leite de inhame', 'leite de semente', 'bebida vegetal', 'leite vegetal',
  'manteiga de amendoim', 'manteiga de cacau', 'manteiga de coco', 'manteiga de castanha',
  'manteiga de amendoa', 'manteiga de amendoas', 'manteiga de gergelim', 'pasta de amendoim',
  'queijo de castanha', 'queijo de castanhas', 'queijo de tofu', 'queijo de soja',
  'queijo de amendoa', 'queijo de amendoas', 'queijo de mandioca', 'queijo de inhame',
  'queijo vegano', 'queijo vegetal',
  'carne de jaca', 'carne de soja', 'carne de caju', 'carne vegetal',
  'proteina de soja', 'proteina texturizada', 'proteina vegetal', 'pts',
  'ovo de linhaca', 'ovo de chia', 'ovos de linhaca', 'ovos de chia', 'substituto de ovo',
  'iogurte de coco', 'iogurte de soja', 'iogurte de castanha', 'iogurte vegetal', 'iogurte vegano',
  'creme de leite de aveia', 'creme de leite de coco', 'creme de leite de soja', 'creme de leite vegetal',
  'leite condensado de coco', 'leite condensado de aveia', 'leite condensado de soja',
  'doce de leite de coco', 'doce de leite de soja', 'doce de leite vegetal',
  'whey vegetal', 'whey vegano', 'whey de ervilha', 'whey de arroz', 'proteina de ervilha', 'proteina de arroz',
  'agar-agar', 'agar agar', 'gelatina vegetal', 'gelatina de agar',
  'melado', 'melado de cana', 'melaco', 'mel de cacau', 'mel de engenho', 'xarope de bordo', 'maple',
  'xarope de agave', 'calda de agave', 'nectar de agave'
];

// Palavras vegetais e culinárias que contêm "mel" como substring
const safeMelSubstrings = [
  'cogumelo', 'cogumelos',
  'caramelo', 'caramelizado', 'caramelizada', 'caramelizados', 'caramelizadas', 'caramelizar',
  'melancia', 'melancias',
  'melao', 'meloes',
  'melissa'
];

function isSafeForVegan(norm: string): boolean {
  if (safeVeganGlobal.some(s => norm.includes(normalizeText(s)))) return true;
  if (safePlantSubstitutes.some(s => norm.includes(normalizeText(s)))) return true;
  return false;
}

// Regras com limites de palavra Unicode (\p{L}) para evitar falsos positivos
const forbiddenVeganRules = [
  { pattern: /(?<!\p{L})(carne|carnes|bovina|bovino|suina|suino|bife|alcatra|patinho|maminha|picanha|costela|lombo|bacon|presunto|linguica|salsicha|salame|mortadela|copa|prosciutto|pernil|vitela|cabrito|carneiro|cordeiro|banha)(?!\p{L})/ui, rule: 'carne' },
  { pattern: /(?<!\p{L})(frango|galinha|peito de frango|sobrecoxa|asa de frango|coxa de frango|peru|blanquet|chester|pato)(?!\p{L})/ui, rule: 'frango/ave' },
  { pattern: /(?<!\p{L})(peixe|peixes|salmao|atum|tilapia|bacalhau|sardinha|pescada|merluza|robalo|camarao|camaroes|lula|polvo|marisco|mariscos|ostra|ostras|mexilhao|mexiloes|caranguejo|siri|lagosta|frutos do mar)(?!\p{L})/ui, rule: 'peixe/frutos do mar' },
  { pattern: /(?<!\p{L})(ovo|ovos|clara|claras|gema|gemas)(?!\p{L})/ui, rule: 'ovo' },
  { pattern: /(?<!\p{L})(leite|nata|chantilly)(?!\p{L})/ui, rule: 'leite' },
  { pattern: /(?<!\p{L})(queijo|queijos|mussarela|mucarela|parmesao|provolone|gorgonzola|brie|camembert|ricota|cottage|requeijao|catupiry|cheddar)(?!\p{L})/ui, rule: 'queijo' },
  { pattern: /(?<!\p{L})(manteiga|ghee)(?!\p{L})/ui, rule: 'manteiga' },
  { pattern: /(?<!\p{L})(iogurte|iogurtes|coalhada)(?!\p{L})/ui, rule: 'iogurte' },
  { pattern: /(?<!\p{L})(mel|propolis|geleia real)(?!\p{L})/ui, rule: 'mel' },
  { pattern: /(?<!\p{L})(gelatina|colageno)(?!\p{L})/ui, rule: 'gelatina animal' },
  { pattern: /(?<!\p{L})(whey|albumina|caseina)(?!\p{L})/ui, rule: 'whey/albumina animal' }
];

const forbiddenVegetarianRules = [
  { pattern: /(?<!\p{L})(carne|carnes|bovina|bovino|suina|suino|bife|alcatra|patinho|maminha|picanha|costela|lombo|bacon|presunto|linguica|salsicha|salame|mortadela|copa|prosciutto|pernil|vitela|cabrito|carneiro|cordeiro|banha)(?!\p{L})/ui, rule: 'carne' },
  { pattern: /(?<!\p{L})(frango|galinha|peito de frango|sobrecoxa|asa de frango|coxa de frango|peru|blanquet|chester|pato)(?!\p{L})/ui, rule: 'frango/ave' },
  { pattern: /(?<!\p{L})(peixe|peixes|salmao|atum|tilapia|bacalhau|sardinha|pescada|merluza|robalo|camarao|camaroes|lula|polvo|marisco|mariscos|ostra|ostras|mexilhao|mexiloes|caranguejo|siri|lagosta|frutos do mar)(?!\p{L})/ui, rule: 'peixe/frutos do mar' },
  { pattern: /(?<!\p{L})(gelatina|colageno)(?!\p{L})/ui, rule: 'gelatina animal' }
];

const forbiddenLactoseRules = [
  { pattern: /(?<!\p{L})(leite|leite condensado|creme de leite|doce de leite|nata|chantilly)(?!\p{L})/ui, rule: 'leite/derivados' },
  { pattern: /(?<!\p{L})(queijo|queijos|mussarela|mucarela|parmesao|provolone|gorgonzola|brie|camembert|ricota|cottage|requeijao|catupiry|cheddar)(?!\p{L})/ui, rule: 'queijo' },
  { pattern: /(?<!\p{L})(manteiga|ghee)(?!\p{L})/ui, rule: 'manteiga' },
  { pattern: /(?<!\p{L})(iogurte|iogurtes|coalhada)(?!\p{L})/ui, rule: 'iogurte' }
];

const safeLactoseMarkers = [
  'sem lactose', 'zero lactose', 'lacfree', 'lactose free', 'lactose-free', 'isento de lactose'
];

const forbiddenGlutenRules = [
  { pattern: /(?<!\p{L})(trigo|farinha de trigo|centeio|cevada|malte|pao frances|pao comum|macarrao comum|massa comum|biscoito comum)(?!\p{L})/ui, rule: 'glúten' }
];

const safeGlutenMarkers = [
  'sem gluten', 'gluten free', 'gluten-free', 'nao contem gluten', 'isento de gluten'
];

const forbiddenSugarRules = [
  { pattern: /(?<!\p{L})(acucar|acucar refinado|acucar cristal|acucar demerara|acucar mascavo|achocolatado comum|calda de chocolate|xarope de milho)(?!\p{L})/ui, rule: 'açúcar' }
];

const safeSugarMarkers = [
  'sem acucar', 'zero acucar', 'sem adicao de acucar', 'diet', 'adocante', 'eritritol', 'xilitol', 'stevia'
];

function validateIngredients(ingredients: string[], dietaryFilters: (string | DietaryFilter)[]): ValidationResult {
  for (const rawIng of ingredients) {
    const norm = normalizeText(rawIng);

    // 1. Validação VEGANO
    if (hasFilter(dietaryFilters, 'vegano')) {
      if (!isSafeForVegan(norm)) {
        for (const r of forbiddenVeganRules) {
          if (r.rule === 'mel' && safeMelSubstrings.some(sub => norm.includes(sub))) {
            continue;
          }
          if (r.pattern.test(norm)) {
            const match = norm.match(r.pattern)?.[0] || r.rule;
            return { forbidden: true, rule: `Vegano (${r.rule})`, term: match, offendingIngredient: rawIng };
          }
        }
      }
    }

    // 2. Validação VEGETARIANO (se for vegetariano mas não vegano)
    if (hasFilter(dietaryFilters, 'vegetariano') && !hasFilter(dietaryFilters, 'vegano')) {
      const isSafePlantMeat = ['carne de jaca', 'carne de soja', 'carne de caju', 'carne vegetal'].some(s => norm.includes(s));
      if (!isSafePlantMeat && !norm.includes('vegetal') && !norm.includes('vegano')) {
        for (const r of forbiddenVegetarianRules) {
          if (r.pattern.test(norm)) {
            const match = norm.match(r.pattern)?.[0] || r.rule;
            return { forbidden: true, rule: `Vegetariano (${r.rule})`, term: match, offendingIngredient: rawIng };
          }
        }
      }
    }

    // 3. Validação SEM LACTOSE
    if (hasFilter(dietaryFilters, 'lactose')) {
      const isLactoseSafe = safeLactoseMarkers.some(m => norm.includes(m)) || isSafeForVegan(norm);
      if (!isLactoseSafe) {
        for (const r of forbiddenLactoseRules) {
          if (r.pattern.test(norm)) {
            const match = norm.match(r.pattern)?.[0] || r.rule;
            return { forbidden: true, rule: `Sem Lactose (${r.rule})`, term: match, offendingIngredient: rawIng };
          }
        }
      }
    }

    // 4. Validação SEM GLÚTEN
    if (hasFilter(dietaryFilters, 'gluten')) {
      const isGlutenSafe = safeGlutenMarkers.some(m => norm.includes(m));
      if (!isGlutenSafe) {
        for (const r of forbiddenGlutenRules) {
          if (r.pattern.test(norm)) {
            const match = norm.match(r.pattern)?.[0] || r.rule;
            return { forbidden: true, rule: `Sem Glúten (${r.rule})`, term: match, offendingIngredient: rawIng };
          }
        }
      }
    }

    // 5. Validação SEM AÇÚCAR
    if (hasFilter(dietaryFilters, 'acucar')) {
      const isSugarSafe = safeSugarMarkers.some(m => norm.includes(m));
      if (!isSugarSafe) {
        for (const r of forbiddenSugarRules) {
          if (r.pattern.test(norm)) {
            const match = norm.match(r.pattern)?.[0] || r.rule;
            return { forbidden: true, rule: `Sem Açúcar (${r.rule})`, term: match, offendingIngredient: rawIng };
          }
        }
      }
    }
  }

  return { forbidden: false };
}

function containsForbiddenIngredients(ingredients: string[], dietaryFilters: (string | DietaryFilter)[]): boolean {
  return validateIngredients(ingredients, dietaryFilters).forbidden;
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

    let dietaryReinforcement = "";
    if (hasFilter(prefs.dietaryFilters, 'vegano')) {
      dietaryReinforcement += `\n\nATENÇÃO OBRIGATÓRIA - PERFIL 100% VEGANO (PLANT-BASED):
Esta receita DEVE ser 100% vegana. É terminantemente PROIBIDO o uso de:
- carne,
- frango,
- peixe,
- frutos do mar,
- ovos,
- leite,
- queijo,
- manteiga,
- iogurte,
- creme de leite,
- whey de origem láctea,
- mel,
- gelatina de origem animal,
- ou qualquer ingrediente de origem animal.
Utilize exclusivamente ingredientes de origem vegetal (tofu, cogumelos, grão-de-bico, lentilha, feijão, soja, castanhas, sementes, azeite, leites vegetais, queijos vegetais, etc.).`;
    } else if (hasFilter(prefs.dietaryFilters, 'vegetariano')) {
      dietaryReinforcement += `\n\nATENÇÃO OBRIGATÓRIA - PERFIL VEGETARIANO:
Esta receita deve ser vegetariana. É expressamente PROIBIDO o uso de qualquer carne bovina, suína, frango, aves, peixes, frutos do mar ou gelatina animal (ovos e laticínios são permitidos).`;
    }

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
- Se o usuário selecionar "Sem Lactose", proíba leite de vaca, queijo comum, iogurte comum, creme de leite comum, manteiga comum e derivados lácteos comuns. Bebidas e queijos vegetais são permitidos.
- Se o usuário selecionar "Vegano", a receita DEVE ser 100% vegetal. Proíba expressamente carne, frango, peixe, frutos do mar, ovos, leite animal, queijo animal, manteiga animal, iogurte animal, creme de leite animal, whey lácteo, mel de abelha, gelatina animal ou qualquer outro derivado de origem animal.
- Se o usuário selecionar "Vegetariano", proíba carnes, aves, peixes, frutos do mar e gelatina animal (ovos e laticínios são permitidos).
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
- Ingredientes para EVITAR: ${prefs.dispensableIngredients || 'Nenhum'}${dietaryReinforcement}

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

    console.log(`[Validation Diagnóstico] Perfil: "${prefs.mealType}", Restrições Ativas: [${prefs.dietaryFilters.join(', ')}]`);

    // 8. Execução da chamada do Gemini (Tentativa 1)
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

    console.log(`[Validation Diagnóstico Tentativa 1] Ingredientes gerados (${recipeData.ingredients?.length || 0}):`, recipeData.ingredients);

    // 9. Validação contra ingredientes proibidos
    const validation1 = validateIngredients(recipeData.ingredients, prefs.dietaryFilters);

    if (validation1.forbidden) {
      console.warn(`[Validation Diagnóstico Bloqueio Tentativa 1] Incompatibilidade detectada! Regra: "${validation1.rule}", Termo: "${validation1.term}", Ingrediente: "${validation1.offendingIngredient}". Regenerando automaticamente...`);
      
      const retryResponse = await withRetry(() =>
        ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `${prompt}

ATENÇÃO EXTRA (REGENERAÇÃO AUTOMÁTICA POR INCOMPATIBILIDADE):
A receita gerada anteriormente foi REJEITADA porque continha o ingrediente incompatível "${validation1.offendingIngredient}" (${validation1.rule}).
Refaça a receita do zero respeitando estritamente todas as restrições selecionadas (${dietProfile}).
Se a restrição for Vegano: use exclusivamente ingredientes 100% vegetais. É expressamente PROIBIDO o uso de carne, frango, peixe, frutos do mar, ovos, leite, queijo, manteiga, iogurte, creme de leite, whey lácteo, mel ou gelatina animal.`,
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
        throw new Error("Não conseguimos gerar uma opção totalmente compatível desta vez. Tente novamente.");
      }

      const retryRecipeData = JSON.parse(retryResponse.text);
      console.log(`[Validation Diagnóstico Tentativa 2] Ingredientes gerados (${retryRecipeData.ingredients?.length || 0}):`, retryRecipeData.ingredients);

      const validation2 = validateIngredients(retryRecipeData.ingredients, prefs.dietaryFilters);
      if (validation2.forbidden) {
        console.error(`[Validation Diagnóstico Bloqueio Tentativa 2] Incompatibilidade persistiu na tentativa 2! Regra: "${validation2.rule}", Termo: "${validation2.term}", Ingrediente: "${validation2.offendingIngredient}".`);
        throw new Error("Não conseguimos gerar uma opção totalmente compatível desta vez. Tente novamente.");
      }

      console.log(`[Validation Diagnóstico Sucesso] Receita aprovada na Tentativa 2!`);
      recipeData.title = retryRecipeData.title;
      recipeData.description = retryRecipeData.description;
      recipeData.ingredients = retryRecipeData.ingredients;
      recipeData.instructions = retryRecipeData.instructions;
      recipeData.estimatedCost = retryRecipeData.estimatedCost;
      recipeData.estimatedTime = retryRecipeData.estimatedTime;
      recipeData.macros = retryRecipeData.macros;
      recipeData.tempId = Math.random().toString(36).substring(7);
    } else {
      console.log(`[Validation Diagnóstico Sucesso] Receita aprovada na Tentativa 1!`);
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
    
    // Retorna mensagem amigável melhorada
    const publicMessage = error.message && (error.message.includes('compatível') || error.message.includes('incompatível'))
      ? error.message
      : 'Não conseguimos gerar uma opção totalmente compatível desta vez. Tente novamente.';
      
    return res.status(500).json({ error: publicMessage });
  }
}
