
import React, { useState, useEffect } from 'react';
import { RecipeResult } from '../types';
import { db, auth, collection, query, where, orderBy, getDocs, deleteDoc, doc } from '../firebase';

interface HistoryListProps {
  onSelect: (r: RecipeResult) => void;
  onBack: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ onSelect, onBack }) => {
  const [hist, setHist] = useState<RecipeResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!auth.currentUser) return;
      
      try {
        const q = query(
          collection(db, 'recipes'),
          where('userId', '==', auth.currentUser.uid),
          orderBy('createdAt', 'desc')
        );
        
        const querySnapshot = await getDocs(q);
        const recipes: RecipeResult[] = [];
        querySnapshot.forEach((doc) => {
          recipes.push(doc.data() as RecipeResult);
        });
        
        setHist(recipes);
      } catch (e) {
        console.error("Erro ao buscar histórico do Firestore:", e);
        // Fallback para localStorage se o Firestore falhar
        setHist(JSON.parse(localStorage.getItem('fit_gen_hist') || '[]'));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const clear = () => {
    alert("Para limpar o histórico permanentemente, você pode gerenciar os documentos no Console do Firebase.");
  };

  return (
    <div className="h-screen bg-slate-50 p-6 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">Histórico</h2>
        <button onClick={clear} className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase">Info</button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-4 pb-24">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 italic font-black">
            <p>Carregando...</p>
          </div>
        ) : hist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 italic font-black">
            <p>Nada por aqui.</p>
          </div>
        ) : (
          hist.map((r, i) => (
            <div 
              key={i} 
              onClick={() => onSelect(r)}
              className="bg-white p-4 rounded-[2rem] shadow-sm flex gap-4 cursor-pointer active:scale-95 transition-all"
            >
              <img src={r.imageUrl} className="w-20 h-20 rounded-[1.5rem] object-cover" alt="" />
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-black text-slate-900 uppercase truncate">{r.title}</h4>
                <p className="text-[10px] font-black text-emerald-500 uppercase">{r.macros.calories} • {r.estimatedTime}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <div className="fixed bottom-0 left-0 w-full p-6 bg-white border-t border-slate-100">
        <button onClick={onBack} className="w-full py-5 bg-emerald-500 text-white font-black rounded-[1.5rem] active:scale-95 transition-all uppercase">Voltar ao Início</button>
      </div>
    </div>
  );
};

export default HistoryList;
