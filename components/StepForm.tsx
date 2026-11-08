import React, { useState } from 'react';
import {
  DietaryFilter,
  NutritionalGoal,
  PreparationCategory,
  MealType,
  CalorieLevel,
  SkillLevel,
  UserPreferences
} from '../types';
import { Language, translations } from '../translations';
import { motion, AnimatePresence } from 'motion/react';

interface StepFormProps {
  initialData: UserPreferences;
  onSubmit: (data: UserPreferences) => void;
  onCancel: () => void;
  language: Language;
}

const MAIN_DIETARY_PROFILES: DietaryFilter[] = [
  DietaryFilter.VEGANO,
  DietaryFilter.VEGETARIANA,
  DietaryFilter.SEM_LACTOSE,
  DietaryFilter.SEM_GLUTEN,
  DietaryFilter.SEM_ACUCAR
];

const MEAL_MOMENT_OPTIONS: MealType[] = [
  MealType.CAFE_DA_MANHA,
  MealType.ALMOCO,
  MealType.JANTAR,
  MealType.LANCHE
];

const StepForm: React.FC<StepFormProps> = ({ initialData, onSubmit, onCancel, language }) => {
  const t = translations[language];
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<UserPreferences>(() => ({
    ...initialData,
    dietaryFilters: [...initialData.dietaryFilters]
  }));
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [showCustomPeopleInput, setShowCustomPeopleInput] = useState(
    ![1, 2, 3, 4].includes(initialData.peopleCount)
  );
  const [customPeopleValue, setCustomPeopleValue] = useState(
    ![1, 2, 3, 4].includes(initialData.peopleCount) ? String(initialData.peopleCount) : ''
  );
  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    if (!agreedToDisclaimer) {
      alert('Para continuar, marque "Li e concordo".');
      return;
    }

    onSubmit(formData);
  };

  const handleBack = () => step > 1 ? setStep(step - 1) : onCancel();

  const toggleDietary = (f: DietaryFilter) => {
    setFormData(p => {
      let newList = [...p.dietaryFilters];

      if (f === DietaryFilter.SEM_RESTRICAO) {
        return { ...p, dietaryFilters: [f] };
      }

      newList = newList.filter(x => x !== DietaryFilter.SEM_RESTRICAO);

      if (newList.includes(f)) {
        newList = newList.filter(x => x !== f);
      } else {
        newList.push(f);
      }

      if (newList.length === 0) newList = [DietaryFilter.SEM_RESTRICAO];

      return { ...p, dietaryFilters: newList };
    });
  };

  const selectNutritionalGoal = (goal: NutritionalGoal | '') => {
    setFormData(p => ({
      ...p,
      nutritionalGoal: goal
    }));
  };

  const selectPreparationCategory = (category: PreparationCategory) => {
    setFormData(p => {
      let nextMealType: MealType = p.mealType;

      if (category === PreparationCategory.REFEICAO) {
        nextMealType = MEAL_MOMENT_OPTIONS.includes(p.mealType)
          ? p.mealType
          : MealType.ALMOCO;
      } else if (category === PreparationCategory.SOBREMESA) {
        nextMealType = MealType.SOBREMESA;
      } else if (category === PreparationCategory.BEBIDA) {
        nextMealType = MealType.BEBIDA;
      } else if (category === PreparationCategory.ALGO_ESPECIFICO) {
        nextMealType = MealType.PRATO_ESPECIFICO;
      }

      return {
        ...p,
        preparationCategory: category,
        mealType: nextMealType,
        dishType: category === PreparationCategory.ALGO_ESPECIFICO ? p.dishType : ''
      };
    });
  };

  const selectMealMoment = (m: MealType) => {
    setFormData(p => ({
      ...p,
      preparationCategory: PreparationCategory.REFEICAO,
      mealType: m,
      dishType: ''
    }));
  };

  const StepHeader = () => {
    const progress = Math.round((step / totalSteps) * 100);

    return (
      <div className="px-8 pt-6 pb-3 space-y-1 flex-shrink-0">
        <div className="flex justify-between items-end">
          <div className="space-y-0">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {t.step} {step} {t.of} {totalSteps}
            </p>
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
              {t.customize}
            </h2>
          </div>
          <div className="text-emerald-500 font-black text-lg">
            {progress}%
          </div>
        </div>

        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className="h-full bg-emerald-500 rounded-full"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-white overflow-hidden">
      <StepHeader />

      <div className="flex-1 overflow-y-auto px-8 py-2 space-y-4 pb-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
                  {t.profileQuestion}
                </h3>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                  {t.profileSub}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                {MAIN_DIETARY_PROFILES.map(f => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => toggleDietary(f)}
                    className={`py-3 px-4 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                      formData.dietaryFilters.includes(f)
                        ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                        : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                    }`}
                  >
                    {(t.dietaryFilters as any)[f]}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => toggleDietary(DietaryFilter.SEM_RESTRICAO)}
                  className={`py-3 px-4 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                    formData.dietaryFilters.includes(DietaryFilter.SEM_RESTRICAO)
                      ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                      : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                  }`}
                >
                  {(t.dietaryFilters as any)[DietaryFilter.SEM_RESTRICAO]}
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
                    {t.nutritionalGoal}
                  </h3>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                    {t.nutritionalGoalSub}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(NutritionalGoal).map(goal => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => selectNutritionalGoal(goal)}
                      className={`py-3 px-4 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                        formData.nutritionalGoal === goal
                          ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                      }`}
                    >
                      {(t.nutritionalGoals as any)[goal]}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={() => selectNutritionalGoal('')}
                    className={`col-span-2 py-3 px-4 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                      formData.nutritionalGoal === ''
                        ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                        : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                    }`}
                  >
                    {t.noNutritionalGoal}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
                  {t.whatToPrepare}
                </h3>
              </div>

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(PreparationCategory).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => selectPreparationCategory(cat)}
                      className={`py-3.5 px-4 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                        formData.preparationCategory === cat
                          ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                      }`}
                    >
                      {(t.preparationCategories as any)[cat]}
                    </button>
                  ))}
                </div>

                {formData.preparationCategory === PreparationCategory.REFEICAO && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {t.mealMoment}
                    </p>

                    <div className="grid grid-cols-2 gap-1.5">
                      {MEAL_MOMENT_OPTIONS.map(m => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => selectMealMoment(m)}
                          className={`py-3 px-4 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                            formData.mealType === m
                              ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                              : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                          }`}
                        >
                          {(t.mealTypes as any)[m]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.preparationCategory === PreparationCategory.ALGO_ESPECIFICO && (
                  <div className="space-y-2 pt-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {t.specificDish}
                    </p>

                    <input
                      placeholder={t.dishPlaceholder}
                      className="w-full p-3.5 bg-white border-2 border-slate-300 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none transition-all"
                      value={formData.dishType}
                      onChange={(e) =>
                        setFormData(p => ({ ...p, dishType: e.target.value }))
                      }
                    />
                  </div>
                )}

                <div className="space-y-2.5 pt-1">
                  <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
                    {t.portions}
                  </h3>

                  <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
                      {t.people}
                    </p>

                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setFormData(p => ({ ...p, peopleCount: num }));
                            setShowCustomPeopleInput(false);
                            setCustomPeopleValue('');
                          }}
                          className={`flex-1 py-3.5 border-2 rounded-xl transition-all font-black text-xs ${
                            formData.peopleCount === num && !showCustomPeopleInput
                              ? 'bg-emerald-50/50 border-emerald-500 text-emerald-600'
                              : 'bg-white border-slate-300 text-slate-800 hover:border-emerald-500 hover:text-emerald-500'
                          }`}
                        >
                          {num}
                        </button>
                      ))}

                      <button
                        type="button"
                        onClick={() => setShowCustomPeopleInput(true)}
                        className={`flex-1 py-3.5 border-2 rounded-xl transition-all font-black text-xs ${
                          showCustomPeopleInput
                            ? 'bg-emerald-50/50 border-emerald-500 text-emerald-600'
                            : 'bg-white border-slate-300 text-slate-800 hover:border-emerald-500 hover:text-emerald-500'
                        }`}
                      >
                        +
                      </button>
                    </div>

                    {showCustomPeopleInput && (
                      <div className="pt-2">
                        <input
                          type="number"
                          min="1"
                          placeholder="Digite a quantidade"
                          value={customPeopleValue}
                          onChange={(e) => {
                            const value = e.target.value;
                            setCustomPeopleValue(value);

                            const parsed = parseInt(value, 10);
                            if (!isNaN(parsed) && parsed > 0) {
                              setFormData(p => ({ ...p, peopleCount: parsed }));
                            }
                          }}
                          className="w-full p-3.5 bg-white border-2 border-slate-300 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none transition-all"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
                  {t.cookingMethodTitle}
                </h3>

                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    'Airfryer',
                    'Fogão',
                    'Forno',
                    'Micro-ondas',
                    'Sem cozimento',
                    'Não definido'
                  ].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, cookingMethod: item }))}
                      className={`py-3 px-4 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                        formData.cookingMethod === item
                          ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
                  {t.calories}
                </h3>

                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(CalorieLevel).map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, calorieLevel: c }))}
                      className={`py-3 px-4 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                        formData.calorieLevel === c
                          ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                      }`}
                    >
                      {(t.calorieLevels as any)[c]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
                  {t.preparation}
                </h3>

                <div className="grid grid-cols-1 gap-1.5">
                  {Object.values(SkillLevel).map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, skillLevel: s }))}
                      className={`py-3 px-6 border-2 rounded-2xl transition-all text-sm font-black uppercase tracking-tight text-left flex justify-between items-center ${
                        formData.skillLevel === s
                          ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                      }`}
                    >
                      <span>{(t.skillLevels as any)[s]}</span>
                      {formData.skillLevel === s && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-5">
                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
                    {t.availableIngredients}
                  </h3>

                  <textarea
                    rows={2}
                    placeholder={t.ingredientsPlaceholder}
                    className="w-full p-5 bg-white border-2 border-slate-300 rounded-[2rem] text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none transition-all resize-none"
                    value={formData.ingredients}
                    onChange={e => setFormData(p => ({ ...p, ingredients: e.target.value }))}
                  />
                </div>

                <div className="space-y-3">
                  <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">
                    {t.avoidIngredients}
                  </h3>

                  <textarea
                    rows={2}
                    placeholder={t.avoidPlaceholder}
                    className="w-full p-5 bg-white border-2 border-slate-300 rounded-[2rem] text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none transition-all resize-none"
                    value={formData.dispensableIngredients}
                    onChange={e => setFormData(p => ({ ...p, dispensableIngredients: e.target.value }))}
                  />

                  <div className="pt-2 px-2 space-y-3">
                    <p className="text-[12px] text-slate-800 text-center font-semibold leading-relaxed pt-2 px-2">
                      Receitas criadas com IA. Antes do consumo, checar ingredientes, alergias e restrições alimentares. Em caso de dúvida, consulte um médico ou um nutricionista. Ao clicar em <strong>GERAR AGORA</strong>, confirmo que estou ciente destas informações.
                    </p>

                    <label className="flex items-center justify-center gap-2 text-[11px] text-slate-900 font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreedToDisclaimer}
                        onChange={(e) => setAgreedToDisclaimer(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500"
                      />
                      Li e concordo
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="px-8 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] bg-white border-t border-slate-100/80 flex gap-4 flex-shrink-0">
        <button
          onClick={handleBack}
          className="flex-1 py-4 bg-white border-2 border-slate-200 text-slate-900 rounded-3xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
        >
          {t.back}
        </button>

        <button
          onClick={handleNext}
          disabled={step === totalSteps && !agreedToDisclaimer}
          className={`flex-[2] py-4 rounded-3xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
            step === totalSteps && !agreedToDisclaimer
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              : 'bg-emerald-500 text-white'
          }`}
        >
          {step === totalSteps ? t.generateNow : t.next}
        </button>
      </div>
    </div>
  );
};

export default StepForm;
