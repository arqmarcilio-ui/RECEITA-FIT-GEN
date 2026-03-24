
import React, { useState } from 'react';
import { DietaryFilter, MealType, CalorieLevel, Flavor, SkillLevel, UserPreferences } from '../types';

interface StepFormProps {
  initialData: UserPreferences;
  onSubmit: (data: UserPreferences) => void;
  onCancel: () => void;
}

const StepForm: React.FC<StepFormProps> = ({ initialData, onSubmit, onCancel }) => {
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
        // Se clicar em Sem Restrição, limpa as outras
        return { ...p, dietaryFilters: [f] };
      } else {
        // Se clicar em outra, remove Sem Restrição
        newList = newList.filter(x => x !== DietaryFilter.SEM_RESTRICAO);
        if (newList.includes(f)) {
          newList = newList.filter(x => x !== f);
        } else {
          newList.push(f);
        }
        // Se esvaziar a lista, volta para Sem Restrição
        if (newList.length === 0) newList = [DietaryFilter.SEM_RESTRICAO];
        return { ...p, dietaryFilters: newList };
      }
    });
  };

  const selectMealType = (m: MealType) => {
    setFormData({ ...formData, mealType: m, dishType: '' });
    setShowDishInput(false);
  };

  const toggleSpecificDish = () => {
    const isNowVisible = !showDishInput;
    setShowDishInput(isNowVisible);
    if (isNowVisible) {
      // Ao clicar em prato especifico, desmarca as outras (Momento do Dia)
      setFormData({ ...formData, mealType: null as any }); 
    } else {
      // Se fechar e não tiver nada, volta para um padrão (ex: Almoço)
      setFormData({ ...formData, mealType: MealType.ALMOCO, dishType: '' });
    }
  };

  // Filtros exceto "Sem Restrição" para o grid
  const otherFilters = Object.values(DietaryFilter).filter(f => f !== DietaryFilter.SEM_RESTRICAO);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="p-6 pb-2 border-b border-slate-50">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-slate-400 font-black text-[10px] uppercase tracking-widest">Etapa {step} de {totalSteps}</p>
            <h2 className="text-2xl font-black text-slate-900">PERSONALIZAR</h2>
          </div>
          <div className="text-emerald-500 font-black text-xl">{Math.round((step / totalSteps) * 100)}%</div>
        </div>
        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${(step / totalSteps) * 100}%` }}></div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4 pb-24">
        {step === 1 && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Qual seu perfil?</h3>
              <p className="text-slate-500 text-xs font-medium">Escolha uma ou mais opções.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {otherFilters.map(f => (
                <button 
                  key={f} 
                  onClick={() => toggleDietary(f)}
                  className={`p-4 rounded-[1.2rem] border-2 font-bold text-xs uppercase transition-all ${
                    formData.dietaryFilters.includes(f) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-700 shadow-sm'
                  }`}
                >
                  {f}
                </button>
              ))}
              {/* Opção Sem Restrição no final ocupando largura total */}
              <button 
                onClick={() => toggleDietary(DietaryFilter.SEM_RESTRICAO)}
                className={`col-span-2 p-4 rounded-[1.2rem] border-2 font-bold text-xs uppercase transition-all ${
                  formData.dietaryFilters.includes(DietaryFilter.SEM_RESTRICAO) ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-700 shadow-sm'
                }`}
              >
                {DietaryFilter.SEM_RESTRICAO}
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-2 animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-[1.5rem] font-black text-slate-900 uppercase tracking-tighter">Momento do dia</h3>
            <div className="space-y-1">
              {Object.values(MealType).map(m => (
                <button 
                  key={m} 
                  onClick={() => selectMealType(m)}
                  className={`w-full p-[0.9rem] rounded-[1rem] border-2 font-bold text-left transition-all ${
                    formData.mealType === m ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-700 shadow-sm'
                  }`}
                >
                  <span className="text-[0.9rem]">{m}</span>
                </button>
              ))}

              {/* Botão Expansível: Prato específico com mesma formatação das demais */}
              <div className={`p-[0.9rem] rounded-[1rem] border-2 transition-all cursor-pointer ${showDishInput ? 'border-emerald-500 bg-emerald-50 shadow-md' : 'border-slate-300 bg-white shadow-sm'}`}>
                <button 
                  onClick={toggleSpecificDish}
                  className="w-full flex justify-between items-center group text-left"
                >
                  <span className={`font-bold text-[0.9rem] transition-colors ${showDishInput ? 'text-emerald-700' : 'text-slate-700'}`}>
                    Prato específico
                  </span>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${showDishInput ? 'bg-emerald-500 text-white rotate-45' : 'bg-slate-100 text-slate-400 group-hover:bg-slate-200'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                </button>
                {showDishInput && (
                  <div className="mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <input 
                      autoFocus
                      placeholder="Ex: Panqueca de Aveia, Poke, Wrap..."
                      className="w-full p-2.5 bg-white border-2 border-emerald-200 rounded-[0.9rem] font-bold text-slate-800 outline-none focus:border-emerald-500 transition-colors shadow-inner text-[0.85rem]"
                      value={formData.dishType}
                      onChange={e => setFormData({...formData, dishType: e.target.value})}
                    />
                    <p className="mt-1 ml-2 text-[8px] font-black text-emerald-600 uppercase opacity-60">Direcione a IA para o que deseja comer</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-2">
              <h3 className="text-[1.3rem] font-black text-slate-900 uppercase tracking-tighter">Porções</h3>
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-[1rem] border-2 border-slate-200">
                <button onClick={() => setFormData(p => ({...p, peopleCount: Math.max(1, p.peopleCount-1)}))} className="w-10 h-10 bg-white border-2 border-slate-300 rounded-xl shadow-sm text-lg font-black text-slate-700 active:scale-90 transition-transform">-</button>
                <div className="flex-1 text-center">
                  <p className="text-[9px] font-black text-slate-400 uppercase">Pessoas</p>
                  <p className="text-2xl font-black text-emerald-600 leading-none">{formData.peopleCount}</p>
                </div>
                <button onClick={() => setFormData(p => ({...p, peopleCount: p.peopleCount+1}))} className="w-10 h-10 bg-white border-2 border-slate-300 rounded-xl shadow-sm text-lg font-black text-slate-700 active:scale-90 transition-transform">+</button>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-[1.3rem] font-black text-slate-900 uppercase tracking-tighter">Calorias</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(CalorieLevel).map(c => (
                  <button 
                    key={c} 
                    onClick={() => setFormData({...formData, calorieLevel: c})}
                    className={`p-2.5 rounded-[0.85rem] border-2 font-bold text-[10.5px] text-left transition-all leading-tight flex items-center min-h-[3.5rem] ${
                      formData.calorieLevel === c ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-700 shadow-sm'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5 animate-in slide-in-from-right-4 duration-300">
            <div className="space-y-2.5">
              <h3 className="text-[1.35rem] font-black text-slate-900 uppercase tracking-tighter">Opção de Sabor</h3>
              <div className="grid grid-cols-1 gap-1.5">
                {Object.values(Flavor).map(f => (
                  <button 
                    key={f} 
                    onClick={() => setFormData({...formData, flavor: f})}
                    className={`p-[0.7rem] rounded-[0.9rem] border-2 font-black text-[0.8rem] transition-all text-left flex justify-between items-center ${
                      formData.flavor === f ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-700 shadow-sm'
                    }`}
                  >
                    <span>{f}</span>
                    {formData.flavor === f && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              <h3 className="text-[1.35rem] font-black text-slate-900 uppercase tracking-tighter">Preparo</h3>
              <div className="grid grid-cols-1 gap-1.5">
                {Object.values(SkillLevel).map(s => (
                  <button 
                    key={s} 
                    onClick={() => setFormData({...formData, skillLevel: s})}
                    className={`p-[0.7rem] rounded-[0.9rem] border-2 font-black text-[0.8rem] transition-all text-left flex justify-between items-center ${
                      formData.skillLevel === s ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-300 bg-white text-slate-700 shadow-sm'
                    }`}
                  >
                    <span>{s}</span>
                    {formData.skillLevel === s && (
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
            <h3 className="text-[1.5rem] font-black text-slate-900 uppercase tracking-tighter">Ingredientes</h3>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">O que VOCÊ TEM disponível?</label>
              <textarea 
                rows={3}
                placeholder="Ex: Frango, batata doce, ovos..."
                className="w-full p-4 bg-slate-50 border-2 border-slate-300 rounded-[1.2rem] font-bold text-slate-800 outline-none focus:border-emerald-500 shadow-inner text-sm"
                value={formData.ingredients}
                onChange={e => setFormData({...formData, ingredients: e.target.value})}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-4">O que EVITAR?</label>
              <textarea 
                rows={2}
                placeholder="Ex: Coentro, cebola crua..."
                className="w-full p-4 bg-slate-50 border-2 border-slate-300 rounded-[1.2rem] font-bold text-slate-800 outline-none focus:border-emerald-500 shadow-inner text-sm"
                value={formData.dispensableIngredients}
                onChange={e => setFormData({...formData, dispensableIngredients: e.target.value})}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-5 bg-white border-t border-slate-100 flex gap-3 backdrop-blur-md">
        <button onClick={handleBack} className="flex-1 py-4 border-2 border-slate-300 text-slate-700 rounded-[1.2rem] font-black uppercase active:bg-slate-50 text-sm">Voltar</button>
        <button onClick={handleNext} className="flex-[2] py-4 bg-emerald-500 text-white rounded-[1.2rem] font-black text-lg shadow-xl active:scale-95 transition-all uppercase">
          {step === totalSteps ? 'GERAR AGORA' : 'PRÓXIMO'}
        </button>
      </div>
    </div>
  );
};

export default StepForm;
