import React, { useState } from 'react';
import { DietaryFilter, MealType, CalorieLevel, Flavor, SkillLevel, UserPreferences } from '../types';
import { Language, translations } from '../translations';
import { motion, AnimatePresence } from 'motion/react';

interface StepFormProps {
  initialData: UserPreferences;
  onSubmit: (data: UserPreferences) => void;
  onCancel: () => void;
  language: Language;
}

const StepForm: React.FC<StepFormProps> = ({ initialData, onSubmit, onCancel, language }) => {
  const t = translations[language];
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<UserPreferences>(initialData);
  const [showDishInput, setShowDishInput] = useState(initialData.dishType !== '');
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [showCustomPeopleInput, setShowCustomPeopleInput] = useState(false);
  const [customPeopleValue, setCustomPeopleValue] = useState('');
  const totalSteps = 5;

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
      } else {
        newList = newList.filter(x => x !== DietaryFilter.SEM_RESTRICAO);
        if (newList.includes(f)) {
          newList = newList.filter(x => x !== f);
        } else {
          newList.push(f);
        }
        if (newList.length === 0) newList = [DietaryFilter.SEM_RESTRICAO];
        return { ...p, dietaryFilters: newList };
      }
    });
  };

  const selectMealType = (m: MealType) => {
  setFormData({ ...formData, mealType: m, dishType: '' });
};
    setShowDishInput(m === MealType.PRATO_ESPECIFICO);
  };

  const otherFilters = Object.values(DietaryFilter).filter(f => f !== DietaryFilter.SEM_RESTRICAO);

  const StepHeader = () => {
    const progress = Math.round((step / totalSteps) * 100);
    return (
      <div className="px-8 pt-8 pb-4 space-y-1">
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
    <div className="flex flex-col h-screen bg-white overflow-hidden">
      <StepHeader />

      <div className="flex-1 overflow-y-auto px-8 py-2 space-y-6 pb-56">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">{t.profileQuestion}</h3>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{t.profileSub}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {otherFilters.map(f => (
                  <button
                    key={f}
                    onClick={() => toggleDietary(f)}
                    className={`p-5 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                      formData.dietaryFilters.includes(f)
                        ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                        : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                    }`}
                  >
                    {(t.dietaryFilters as any)[f]}
                  </button>
                ))}
                <button
                  onClick={() => toggleDietary(DietaryFilter.SEM_RESTRICAO)}
                  className={`p-5 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                    formData.dietaryFilters.includes(DietaryFilter.SEM_RESTRICAO)
                      ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                      : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                  }`}
                >
                  {(t.dietaryFilters as any)[DietaryFilter.SEM_RESTRICAO]}
                </button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">{t.mealMoment}</h3>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(MealType).map(m => (
                    <button
                      key={m}
                      onClick={() => selectMealType(m)}
                      className={`p-5 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
                        formData.mealType === m
                          ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                      }`}
                    >
                      {(t.mealTypes as any)[m]}
                    </button>
                  ))}
                </div>

                <div className="space-y-3 pt-3">
                  <h3 className="text-xl font-black text-slate-900 uppercase leading-none tracking-tight">
                    FORMA DE COZIMENTO
                  </h3>

                  <div className="grid grid-cols-2 gap-2">
                    {[
                      "Airfryer",
                      "Fogão",
                      "Forno",
                      "Micro-ondas",
                      "Sem cozimento",
                      "Não definido"
                    ].map((item) => (
                      <button
                        key={item}
                        onClick={() => setFormData({ ...formData, cookingMethod: item })}
                        className={`p-4 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
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

            {formData.mealType === MealType.PRATO_ESPECIFICO && (
  <div className="space-y-2 pt-2">
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">
      {t.specificDish}
    </p>

    <input
      placeholder={t.dishPlaceholder}
      className="w-full p-4 bg-white border-2 border-slate-300 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none transition-all"
      value={formData.dishType}
      onChange={(e) =>
        setFormData({ ...formData, dishType: e.target.value })
      }
    />
  </div>
)}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">{t.portions}</h3>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">{t.people}</p>

                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((num) => (
                      <button
                        key={num}
                        onClick={() => {
                          setFormData(p => ({ ...p, peopleCount: num }));
                          setShowCustomPeopleInput(false);
                          setCustomPeopleValue('');
                        }}
                        className={`flex-1 py-5 border-2 rounded-xl transition-all font-black text-xs ${
                          formData.peopleCount === num && !showCustomPeopleInput
                            ? 'bg-emerald-50/50 border-emerald-500 text-emerald-600'
                            : 'bg-white border-slate-300 text-slate-800 hover:border-emerald-500 hover:text-emerald-500'
                        }`}
                      >
                        {num}
                      </button>
                    ))}

                    <button
                      onClick={() => setShowCustomPeopleInput(true)}
                      className={`flex-1 py-5 border-2 rounded-xl transition-all font-black text-xs ${
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
                        className="w-full p-4 bg-white border-2 border-slate-300 rounded-2xl text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">{t.calories}</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(CalorieLevel).map(c => (
                      <button
                        key={c}
                        onClick={() => setFormData({ ...formData, calorieLevel: c })}
                        className={`p-5 border-2 rounded-2xl transition-all text-[10px] font-black uppercase tracking-widest text-center ${
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
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">{t.flavorOption}</h3>
                <div className="grid grid-cols-1 gap-2">
                  {Object.values(Flavor).map(f => (
                    <button
                      key={f}
                      onClick={() => setFormData({ ...formData, flavor: f })}
                      className={`p-4 border-2 rounded-2xl transition-all text-sm font-black uppercase tracking-tight text-left px-6 ${
                        formData.flavor === f
                          ? 'bg-emerald-50/50 text-emerald-600 border-emerald-500'
                          : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:text-emerald-500'
                      }`}
                    >
                      {(t.flavors as any)[f]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">{t.preparation}</h3>
                <div className="grid grid-cols-1 gap-2">
                  {Object.values(SkillLevel).map(s => (
                    <button
                      key={s}
                      onClick={() => setFormData({ ...formData, skillLevel: s })}
                      className={`p-4 border-2 rounded-2xl transition-all text-sm font-black uppercase tracking-tight text-left px-6 flex justify-between items-center ${
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

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">{t.availableIngredients}</h3>
                  <textarea
                    rows={2}
                    placeholder={t.ingredientsPlaceholder}
                    className="w-full p-5 bg-white border-2 border-slate-300 rounded-[2rem] text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none transition-all resize-none"
                    value={formData.ingredients}
                    onChange={e => setFormData({ ...formData, ingredients: e.target.value })}
                  />
                </div>

                <div className="space-y-4">
                  <h3 className="text-2xl font-black text-slate-900 uppercase leading-none tracking-tight">{t.avoidIngredients}</h3>
                  <textarea
                    rows={2}
                    placeholder={t.avoidPlaceholder}
                    className="w-full p-5 bg-white border-2 border-slate-300 rounded-[2rem] text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:border-emerald-500 focus:outline-none transition-all resize-none"
                    value={formData.dispensableIngredients}
                    onChange={e => setFormData({ ...formData, dispensableIngredients: e.target.value })}
                  />

                  <div className="pt-3 px-2 space-y-3">
                    <p className="text-[12px] text-slate-800 text-center font-semibold leading-relaxed pt-3 px-2">
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

      <div className="px-8 pt-4 pb-12 bg-white flex gap-4 absolute bottom-10 left-0 right-0">
        <button
          onClick={handleBack}
          className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-900 rounded-3xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
        >
          {t.back}
        </button>

        <button
          onClick={handleNext}
          disabled={step === totalSteps && !agreedToDisclaimer}
          className={`flex-[2] py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 ${
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
