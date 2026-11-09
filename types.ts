
export enum DietaryFilter {
  SEM_RESTRICAO = 'Sem Restrição',
  VEGANO = 'Vegano',
  VEGETARIANA = 'Vegetariano',
  LOW_CARB = 'Low Carb',
  SEM_LACTOSE = 'Sem Lactose',
  SEM_GLUTEN = 'Sem Glúten',
  SEM_ACUCAR = 'Sem Açúcar'
}

export enum NutritionalGoal {
  EMAGRECIMENTO = 'Emagrecimento',
  GANHO_DE_MASSA = 'Ganho de massa',
  ALTA_PROTEINA = 'Alta proteína',
  LOW_CARB = 'Low Carb',
  BAIXA_CALORIA = 'Baixa caloria',
  MAIS_FIBRAS = 'Mais fibras'
}

export enum PreparationCategory {
  REFEICAO = 'Refeição',
  SOBREMESA = 'Sobremesa',
  BEBIDA = 'Bebida',
  ALGO_ESPECIFICO = 'Algo específico'
}

export enum MealType {
  CAFE_DA_MANHA = 'Café da Manhã',
  ALMOCO = 'Almoço',
  JANTAR = 'Jantar',
  LANCHE = 'Lanche',
  SOBREMESA = 'Sobremesa',
  BEBIDA = 'Bebida',
  PRATO_ESPECIFICO = 'Prato Específico'
}

export enum CalorieLevel {
  BAIXISSIMO = 'Até 200 kcal',
  BAIXO = '200-400 kcal',
  MEDIO = '400-600 kcal',
  ALTO = '600-800 kcal',
  ALTISSIMO = '800+ kcal',
  NAO_DEFINIDO = 'Não definido'
}

export enum SkillLevel {
  BASICA = 'Básica',
  INTERMEDIARIA = 'Intermediária',
  AVANCADA = 'Avançada'
}

export interface UserPreferences {
  dietaryFilters: DietaryFilter[];
  nutritionalGoal: NutritionalGoal | '';
  preparationCategory: PreparationCategory;
  mealType: MealType;
  dishType: string;
  cookingMethod: string;
  peopleCount: number;
  calorieLevel: CalorieLevel;
  ingredients: string;
  dispensableIngredients: string;
  skillLevel: SkillLevel;
}

export const createInitialFormState = (): UserPreferences => ({
  dietaryFilters: [DietaryFilter.SEM_RESTRICAO],
  nutritionalGoal: '',
  preparationCategory: PreparationCategory.REFEICAO,
  mealType: MealType.ALMOCO,
  dishType: '',
  cookingMethod: 'Não definido',
  peopleCount: 1,
  calorieLevel: CalorieLevel.NAO_DEFINIDO,
  ingredients: '',
  dispensableIngredients: '',
  skillLevel: SkillLevel.BASICA
});

export const initialFormState: UserPreferences = createInitialFormState();

export type HistoryTypeValue =
  | 'Café da manhã'
  | 'Almoço'
  | 'Jantar'
  | 'Lanche'
  | 'Sobremesa'
  | 'Bebida'
  | 'Algo específico';

export function resolveHistoryTypeFromPrefs(prefs: {
  preparationCategory?: PreparationCategory | string;
  mealType?: MealType | string;
}): HistoryTypeValue | undefined {
  const prep = String(prefs.preparationCategory || '').trim();
  const meal = String(prefs.mealType || '').trim();

  if (prep === PreparationCategory.SOBREMESA || meal === MealType.SOBREMESA) {
    return 'Sobremesa';
  }
  if (prep === PreparationCategory.BEBIDA || meal === MealType.BEBIDA) {
    return 'Bebida';
  }
  if (prep === PreparationCategory.ALGO_ESPECIFICO || meal === MealType.PRATO_ESPECIFICO || meal === 'Algo específico') {
    return 'Algo específico';
  }

  // Caso Refeição ou legado com mealType direto
  if (meal === MealType.CAFE_DA_MANHA || meal.toLowerCase() === 'café da manhã' || meal.toLowerCase() === 'cafe da manha') {
    return 'Café da manhã';
  }
  if (meal === MealType.ALMOCO || meal.toLowerCase() === 'almoço' || meal.toLowerCase() === 'almoco') {
    return 'Almoço';
  }
  if (meal === MealType.JANTAR || meal.toLowerCase() === 'jantar') {
    return 'Jantar';
  }
  if (meal === MealType.LANCHE || meal.toLowerCase() === 'lanche') {
    return 'Lanche';
  }

  return undefined;
}

export function resolveRecipeHistoryType(recipe: {
  historyType?: string;
  mealType?: string;
  preparationCategory?: string;
  recipeType?: string;
  type?: string;
  category?: string;
}): HistoryTypeValue | undefined {
  const raw =
    recipe.historyType ||
    recipe.mealType ||
    recipe.preparationCategory ||
    recipe.recipeType ||
    recipe.type ||
    recipe.category;

  if (!raw || typeof raw !== 'string') return undefined;

  const norm = raw.trim().toLowerCase();
  if (norm === 'café da manhã' || norm === 'cafe da manha') return 'Café da manhã';
  if (norm === 'almoço' || norm === 'almoco') return 'Almoço';
  if (norm === 'jantar') return 'Jantar';
  if (norm === 'lanche') return 'Lanche';
  if (norm === 'sobremesa') return 'Sobremesa';
  if (norm === 'bebida') return 'Bebida';
  if (norm === 'algo específico' || norm === 'algo especifico' || norm === 'prato específico' || norm === 'prato especifico') {
    return 'Algo específico';
  }

  return undefined;
}

export interface RecipeResult {
  id?: string;
  title: string;
  description: string;
  ingredients: string[];
  instructions: string[];
  estimatedCost: string;
  estimatedTime: string;
  imageUrl?: string;
  tempId?: string;
  publicDocId?: string;
  imageError?: boolean;
  dietaryFilters?: DietaryFilter[];
  historyType?: HistoryTypeValue;
  mealType?: string;
  preparationCategory?: string;
  peopleCount?: number;
  macros: {
    protein: string;
    carbs: string;
    fats: string;
    calories: string;
  };
  isFavorite?: boolean;
  timings?: any;
}
