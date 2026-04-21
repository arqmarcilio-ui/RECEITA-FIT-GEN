import React, { useState } from 'react';
import { DietaryFilter, MealType, CalorieLevel, Flavor, SkillLevel, UserPreferences } from '../types';
import { Language, translations } from '../translations';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Flame,
  Utensils,
  ChefHat,
  Plus,
  X
} from 'lucide-react';
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

  const handleBack = () => {
    step > 1 ? setStep(step - 1) : onCancel();
  };

  const toggleDietary = (f: DietaryFilter) => {
    setFormData(prev => {
      let newList = [...prev.dietaryFilters];

      if (f === DietaryFilter.SEM_RESTRICAO) {
        return { ...prev, dietaryFilters: [f] };
      }

      newList = newList.filter(x => x !== DietaryFilter.SEM_RESTRICAO);

      if (newList.includes(f)) {
        newList = newList.filter(x => x !== f);
      } else {
        newList.push(f);
      }

      if (newList.length === 0) {
        newList = [DietaryFilter.SEM_RESTRICAO];
      }

      return { ...prev, dietaryFilters: newList };
    });
  };

  const selectMealType = (m: MealType) => {
    setFormData({ ...formData, mealType: m, dishType: '' });
    setShowDishInput(m === MealType.PRATO_ESPECIFICO);
  };

  const otherFilters = Object.values(DietaryFilter).filter(
    f => f !== DietaryFilter.SEM_RESTRICAO
  );

  const StepHeader = () => {
    const progress = Math.round((step / totalSteps) * 100);

    return (
      <div className="px-8 pt-8 pb-4 space-y-1">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              {t.step} {step} {t.of} {totalSteps}
            </p>

            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">
              {t.customize}
            </h2>
          </div>

          <div className="text-emerald-500 font-black text-lg">{progress}%</div>
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

          {/* ETAPA 1 */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase">
                  {t.profileQuestion}
                </h3>
                <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                  {t.profileSub}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {otherFilters.map(f => (
                  <button
                    key={f}
                    onClick={() => toggleDietary(f)}
                    className={`p-5 border-2 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                      formData.dietaryFilters.includes(f)
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {(t.dietaryFilters as any)[f]}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ETAPA 2 */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <h3 className="text-2xl font-black text-slate-900 uppercase">
                {t.mealMoment}
              </h3>

              <div className="grid grid-cols-2 gap-2">
                {Object.values(MealType).map(m => (
                  <button
                    key={m}
                    onClick={() => selectMealType(m)}
                    className={`p-5 border-2 rounded-2xl text-[10px] font-black uppercase ${
                      formData.mealType === m
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-500'
                        : 'border-slate-300'
                    }`}
                  >
                    {(t.mealTypes as any)[m]}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ETAPA 3 */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <h3 className="text-2xl font-black text-slate-900 uppercase">
                {t.portions}
              </h3>
            </motion.div>
          )}

          {/* ETAPA 4 */}
          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <h3 className="text-2xl font-black text-slate-900 uppercase">
                {t.flavorOption}
              </h3>
            </motion.div>
          )}

          {/* ETAPA 5 */}
          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <h3 className="text-2xl font-black text-slate-900 uppercase">
                  {t.availableIngredients}
                </h3>

                <textarea
                  rows={4}
                  placeholder={t.ingredientsPlaceholder}
                  className="w-full p-5 border-2 border-slate-300 rounded-[2rem]"
                  value={formData.ingredients}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      ingredients: e.target.value
                    })
                  }
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-black text-slate-900 uppercase">
                  {t.avoidIngredients}
                </h3>

                <textarea
                  rows={3}
                  placeholder={t.avoidPlaceholder}
                  className="w-full p-5 border-2 border-slate-300 rounded-[2rem]"
                  value={formData.dispensableIngredients}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      dispensableIngredients: e.target.value
                    })
                  }
                />

                <div className="pt-3 px-2 space-y-3">
                  <p className="text-[11px] text-slate-800 text-center font-semibold leading-relaxed">
                    Receitas criadas com IA. Antes do consumo, confirme ingredientes,
                    alergias e restrições alimentares. Em caso de dúvidas, consulte
                    médico ou nutricionista. Ao clicar em{' '}
                    <strong>GERAR AGORA</strong>, confirmo que li e concordo.
                  </p>

                  <label className="flex items-center justify-center gap-2 text-[11px] text-slate-900 font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToDisclaimer}
                      onChange={(e) =>
                        setAgreedToDisclaimer(e.target.checked)
                      }
                      className="w-4 h-4 accent-emerald-500"
                    />
                    Li e concordo
                  </label>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* FOOTER */}
      <div className="px-8 pt-4 pb-12 bg-white flex gap-4 absolute bottom-10 left-0 right-0">
        <button
          onClick={handleBack}
          className="flex-1 py-5 bg-white border-2 border-slate-200 rounded-3xl font-black text-sm uppercase"
        >
          {t.back}
        </button>

        <button
          onClick={handleNext}
          disabled={step === totalSteps && !agreedToDisclaimer}
          className={`flex-[2] py-5 rounded-3xl font-black text-sm uppercase ${
            step === totalSteps && !agreedToDisclaimer
              ? 'bg-slate-300 text-slate-500'
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
