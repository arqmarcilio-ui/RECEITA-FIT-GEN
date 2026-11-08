
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
