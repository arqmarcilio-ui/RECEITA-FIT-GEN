import React, { useEffect, useState } from 'react';
import { Language } from '../translations';
import { RecipeResult } from '../types';
import { db, collection, getDocs, query, orderBy, deleteDoc, doc } from '../firebase';

interface AdminRecipe extends RecipeResult {
  firestoreId?: string;
  authorEmail?: string;
  authorName?: string;
  createdAt?: any;
}

interface Props {
  language: Language;
  onBack: () => void;
  onSelect: (recipe: RecipeResult) => void;
}

const AdminHistoryList: React.FC<Props> = ({ onBack, onSelect }) => {
  const [recipes, setRecipes] = useState<AdminRecipe[]>([]);
  const [search, setSearch] = useState('');

  const loadRecipes = async () => {
    const q = query(collection(db, 'public_recipes'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    const list = snap.docs.map((d) => ({
      firestoreId: d.id,
      ...(d.data() as AdminRecipe),
    }));

    setRecipes(list);
  };

  useEffect(() => {
    loadRecipes();
  }, []);

  const handleDelete = async (id?: string) => {
    if (!id) return;

    const confirmDelete = window.confirm('Excluir receita?');

    if (!confirmDelete) return;

    await deleteDoc(doc(db, 'public_recipes', id));

    setRecipes((prev) => prev.filter((r) => r.firestoreId !== id));
  };

  const filtered = recipes.filter((r) => {
    const name = (r.authorName || '').toLowerCase();
    const email = (r.authorEmail || '').toLowerCase();
    const term = search.toLowerCase();

    return name.includes(term) || email.includes(term);
  });

  const formatDate = (createdAt: any) => {
    try {
      if (createdAt?.toDate) {
        return createdAt.toDate().toLocaleString('pt-BR');
      }
      return '-';
    } catch {
      return '-';
    }
  };

  return (
    <div className="min-h-screen bg-white px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-100 rounded-full font-bold"
        >
          Voltar
        </button>

        <h2 className="font-black uppercase text-sm tracking-widest text-slate-500">
          Admin
        </h2>
      </div>

      <input
        placeholder="Pesquisar usuário"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-4 border-2 border-slate-300 rounded-2xl mb-6 font-bold"
      />

      <div className="space-y-4">
        {filtered.map((recipe) => (
          <div
            key={recipe.firestoreId}
            className="p-5 rounded-3xl border border-slate-200 bg-slate-50"
          >
            <h3 className="font-black text-slate-900 mb-2">
              {recipe.title}
            </h3>

            <p className="text-xs font-bold text-slate-500">
              {recipe.authorName || 'Usuário'}
            </p>

            <p className="text-xs font-bold text-slate-500">
              {recipe.authorEmail}
            </p>

            <p className="text-xs font-bold text-slate-500 mb-4">
              {formatDate(recipe.createdAt)}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => onSelect(recipe)}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase"
              >
                Ver
              </button>

              <button
                onClick={() => handleDelete(recipe.firestoreId)}
                className="px-4 py-3 bg-red-100 text-red-600 rounded-2xl font-black text-xs uppercase"
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminHistoryList;
