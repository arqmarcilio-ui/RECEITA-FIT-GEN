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
  const totalSteps = 5;

  const handleNext = () => step < totalSteps ? setStep(step + 1) : onSubmit(formData);
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
    setShowDishInput(m === MealType.PRATO_ESPECIFICO);
  };

  const toggleSpecificDish = () => {
    const isNowVisible = !showDishInput;
    setShowDishInput(isNowVisible);
    if (isNowVisible) {
      setFormData({ ...formData, mealType: null as any }); 
    } else {
      setFormData({ ...formData, mealType: MealType.ALMOCO, dishType: '' });
    }
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
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight leading-none">{t.customize}</h2>
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

      {/* ALTERAÇÃO 1: só mudou pb-24 para pb-32 */}
      <div className="flex-1 overflow-y-auto px-8 py-2 space-y-6 pb-32">
        <AnimatePresence mode="wait">

          {/* MANTENHA TODO O CONTEÚDO ORIGINAL DAS 5 ETAPAS EXATAMENTE COMO ESTÁ */}
          {/* Cole aqui todo o conteúdo interno original que você já tem hoje */}
          
        </AnimatePresence>
      </div>

      {/* ALTERAÇÃO 2: disclaimer adicionado */}
      <div className="px-8 pb-2">
        <p className="text-[10px] text-slate-400 text-center leading-relaxed font-bold uppercase tracking-tight">
          Receitas geradas por IA. Confira ingredientes em caso de alergias severas.
        </p>
      </div>

      {/* Footer Actions ORIGINAL */}
      <div className="p-8 bg-white flex gap-4 absolute bottom-0 left-0 right-0">
        <button 
          onClick={handleBack} 
          className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-900 rounded-3xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all"
        >
          {t.back}
        </button>

        <button 
          onClick={handleNext} 
          className="flex-[2] py-5 bg-emerald-500 text-white rounded-3xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {step === totalSteps ? (
            <>
              {t.generateNow}
            </>
          ) : (
            <>
              {t.next}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default StepForm;
