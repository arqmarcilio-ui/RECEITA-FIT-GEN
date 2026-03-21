
export enum DietaryFilter {
  SEM_RESTRICAO = 'Sem Restrição',
  VEGANO = 'Vegano',
  VEGETARIANA = 'Vegetariano',
  LOW_CARB = 'Low Carb',
  SEM_LACTOSE = 'Sem Lactose',
  SEM_GLUTEN = 'Sem Glúten',
  SEM_ACUCAR = 'Sem Açúcar'
}

export enum MealType {
  CAFE_DA_MANHA = 'Café da Manhã',
  ALMOCO = 'Almoço',
  JANTAR = 'Jantar',
  LANCHE = 'Lanche',
  SOBREMESA = 'Sobremesa'
}

export enum CalorieLevel {
  BAIXISSIMO = 'Até 200 kcal',
  BAIXO = '200-400 kcal',
  MEDIO = '400-600 kcal',
  ALTO = '600-800 kcal',
  ALTISSIMO = '800+ kcal',
  NAO_DEFINIDO = 'Não definido'
}

export enum Flavor {
  SALGADO = 'Salgado',
  DOCE = 'Doce',
  AGRIDOCE = 'Agridoce'
}

export enum SkillLevel {
  BASICA = 'Básica',
  INTERMEDIARIA = 'Intermediária',
  AVANCADA = 'Avançada'
}

export interface UserPreferences {
  dietaryFilters: DietaryFilter[];
  mealType: MealType;
  dishType: string;
  peopleCount: number;
  calorieLevel: CalorieLevel;
  flavor: Flavor;
  ingredients: string;
  dispensableIngredients: string;
  skillLevel: SkillLevel;
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
  macros: {
    protein: string;
    carbs: string;
    fats: string;
    calories: string;
  };
  isFavorite?: boolean;
}
