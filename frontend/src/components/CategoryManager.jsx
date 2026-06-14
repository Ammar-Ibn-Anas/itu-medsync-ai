import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, FolderOpen } from 'lucide-react';
import api from '../../api';

export default function CategoryManager({ 
  categories, 
  activeCategoryId, 
  onSelectCategory,
  onCategoriesChange,
  onDeleteCategory
}) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nameInput, setNameInput] = useState('');
  
  const handleCreate = async () => {
    if (!nameInput.trim()) return;
    try {
      const res = await api.post('/api/categories', { name: nameInput, description: '' });
      onCategoriesChange([...categories, res.data]);
      setIsCreating(false);
      setNameInput('');
    } catch (err) {
      alert("Failed to create category: " + (err.response?.data?.detail || err.message));
    }
  };

  const handleUpdate = async (id) => {
    if (!nameInput.trim()) return;
    try {
      const res = await api.put(`/api/categories/${id}`, { name: nameInput, description: '' });
      onCategoriesChange(categories.map(c => c.id === id ? res.data : c));
      setEditingId(null);
    } catch (err) {
      alert("Failed to update category");
    }
  };

  const startEdit = (cat) => {
    setEditingId(cat.id);
    setNameInput(cat.name);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-2 bg-slate-800 p-1.5 rounded-lg border border-slate-700 overflow-x-auto dark-scroll max-w-full">
        
        <button
          onClick={() => onSelectCategory(null)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategoryId === null 
              ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30' 
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 border border-transparent'
          }`}
        >
          <FolderOpen className="w-4 h-4" /> All Docs
        </button>

        <div className="w-px h-6 bg-slate-700 mx-1"></div>

        {categories.map(cat => (
          <div key={cat.id} className="flex items-center">
            {editingId === cat.id ? (
              <div className="flex items-center gap-1 bg-slate-900 rounded-md px-2 py-1 border border-teal-500/50">
                <input
                  autoFocus
                  type="text"
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleUpdate(cat.id)}
                  className="bg-transparent text-sm text-white w-24 outline-none"
                />
                <button onClick={() => handleUpdate(cat.id)} className="text-teal-400 hover:text-teal-300 p-0.5"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditingId(null)} className="text-slate-500 hover:text-slate-300 p-0.5"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <div className={`flex items-center gap-1 pl-3 pr-1 py-1 rounded-md border transition-colors group ${
                activeCategoryId === cat.id 
                  ? 'bg-teal-500/10 border-teal-500/30' 
                  : 'border-transparent hover:bg-slate-700/50'
              }`}>
                <button
                  onClick={() => onSelectCategory(cat.id)}
                  className={`text-sm font-medium whitespace-nowrap transition-colors ${
                    activeCategoryId === cat.id ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
                <div className={`flex items-center ml-1 ${activeCategoryId === cat.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                  <button onClick={() => startEdit(cat)} className="p-1 text-slate-500 hover:text-teal-400"><Edit2 className="w-3 h-3" /></button>
                  <button onClick={() => onDeleteCategory(cat)} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            )}
          </div>
        ))}

        {isCreating ? (
          <div className="flex items-center gap-1 bg-slate-900 rounded-md px-2 py-1 border border-teal-500/50 ml-1">
            <input
              autoFocus
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="Name..."
              className="bg-transparent text-sm text-white w-24 outline-none"
            />
            <button onClick={handleCreate} className="text-teal-400 hover:text-teal-300 p-0.5"><Check className="w-3.5 h-3.5" /></button>
            <button onClick={() => setIsCreating(false)} className="text-slate-500 hover:text-slate-300 p-0.5"><X className="w-3.5 h-3.5" /></button>
          </div>
        ) : (
          <button
            onClick={() => { setIsCreating(true); setNameInput(''); setEditingId(null); }}
            className="flex items-center gap-1 px-3 py-1.5 ml-1 rounded-md text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors whitespace-nowrap border border-dashed border-slate-600 hover:border-slate-500"
          >
            <Plus className="w-4 h-4" /> New
          </button>
        )}
      </div>
    </div>
  );
}
