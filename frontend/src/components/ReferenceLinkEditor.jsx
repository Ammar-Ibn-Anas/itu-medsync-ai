import React, { useState } from 'react';
import { Plus, Trash2, Link as LinkIcon, ExternalLink, Globe, FileText } from 'lucide-react';

export default function ReferenceLinkEditor({ links = [], onChange }) {
  const [newLink, setNewLink] = useState({ name: '', url: '' });
  const [isAdding, setIsAdding] = useState(false);

  const handleAdd = () => {
    if (!newLink.name.trim()) return;
    onChange([...links, { ...newLink, ai_generated: false }]);
    setNewLink({ name: '', url: '' });
    setIsAdding(false);
  };

  const handleRemove = (index) => {
    const updated = [...links];
    updated.splice(index, 1);
    onChange(updated);
  };

  const handleUpdate = (index, field, value) => {
    const updated = [...links];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-slate-300">Reference Links for Drift Detection</h4>
        {!isAdding && (
          <button 
            type="button"
            onClick={() => setIsAdding(true)}
            className="text-xs font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1 bg-teal-500/10 px-2 py-1 rounded"
          >
            <Plus className="w-3 h-3" /> Add Link
          </button>
        )}
      </div>

      {links.length === 0 && !isAdding && (
        <div className="p-4 border border-dashed border-slate-700 rounded-lg text-center text-sm text-slate-500 bg-slate-900/50">
          No reference links added. The AI will not be able to detect drift for this document.
        </div>
      )}

      {/* Existing Links List */}
      <div className="space-y-2">
        {links.map((link, i) => (
          <div key={i} className="flex items-start gap-2 p-3 bg-slate-900 border border-slate-700 rounded-lg group">
            <div className="mt-1.5 text-slate-500">
              {link.url ? <Globe className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
            </div>
            <div className="flex-1 space-y-2">
              <input
                type="text"
                value={link.name}
                onChange={e => handleUpdate(i, 'name', e.target.value)}
                className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-teal-500 text-sm font-medium text-white px-1 py-0.5 outline-none transition-colors"
                placeholder="Source Name"
              />
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={link.url}
                  onChange={e => handleUpdate(i, 'url', e.target.value)}
                  className="flex-1 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-teal-500 text-xs text-slate-400 px-1 py-0.5 outline-none transition-colors"
                  placeholder="https://..."
                />
                {link.url && (
                  <a href={link.url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-teal-400 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end justify-between h-full gap-2">
              <button
                type="button"
                onClick={() => handleRemove(i)}
                className="text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              {link.ai_generated && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  AI Found
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Link Form */}
      {isAdding && (
        <div className="p-3 bg-slate-800 border border-teal-500/50 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2">
          <input
            type="text"
            value={newLink.name}
            onChange={e => setNewLink({ ...newLink, name: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded text-sm text-white px-3 py-1.5 outline-none focus:border-teal-500"
            placeholder="Source Name (e.g. CDC Guidelines)"
            autoFocus
          />
          <input
            type="url"
            value={newLink.url}
            onChange={e => setNewLink({ ...newLink, url: e.target.value })}
            className="w-full bg-slate-900 border border-slate-700 rounded text-sm text-white px-3 py-1.5 outline-none focus:border-teal-500"
            placeholder="URL (https://...)"
          />
          <div className="flex justify-end gap-2 pt-1">
            <button 
              type="button" 
              onClick={() => setIsAdding(false)}
              className="text-xs px-3 py-1.5 rounded text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={handleAdd}
              disabled={!newLink.name.trim()}
              className="text-xs px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-medium disabled:opacity-50"
            >
              Save Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

