import React, { useState, useEffect } from 'react';
import { Upload, Trash2 } from 'lucide-react';
import api from '../../api';
import CategoryManager from '../../components/CategoryManager';
import DocumentCard from '../../components/DocumentCard';
import DocumentUploadModal from '../../components/DocumentUploadModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { LoadingSpinner } from '../../components/shared';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  
  // Selection state
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  
  // Delete dialogs
  const [catToDelete, setCatToDelete] = useState(null);
  const [docToDelete, setDocToDelete] = useState(null);
  const [showBulkDelete, setShowBulkDelete] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [catsRes, docsRes] = await Promise.all([
        api.get('/api/categories'),
        api.get(activeCategoryId ? `/api/documents?category_id=${activeCategoryId}` : '/api/documents')
      ]);
      setCategories(catsRes.data);
      setDocuments(docsRes.data.documents || []);
      setSelectedDocs(new Set()); // Reset selection on fetch
    } catch (err) {
      console.error("Failed to fetch data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeCategoryId]);

  // Handlers
  const handleDeleteCategory = async () => {
    if (!catToDelete) return;
    try {
      await api.delete(`/api/categories/${catToDelete.id}`);
      if (activeCategoryId === catToDelete.id) setActiveCategoryId(null);
      setCatToDelete(null);
      fetchData();
    } catch (err) {
      alert("Failed to delete category");
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete) return;
    try {
      await api.delete(`/api/documents/${docToDelete.id}`);
      setDocuments(documents.filter(d => d.id !== docToDelete.id));
      setDocToDelete(null);
    } catch (err) {
      alert("Failed to delete document");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;
    try {
      await api.post('/api/documents/bulk-delete', { ids: Array.from(selectedDocs) });
      fetchData();
      setShowBulkDelete(false);
    } catch (err) {
      alert("Failed to delete documents");
    }
  };

  const toggleDocSelection = (id) => {
    const newSel = new Set(selectedDocs);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSelectedDocs(newSel);
  };

  const toggleAll = () => {
    if (selectedDocs.size === documents.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(documents.map(d => d.id)));
    }
  };

  const handleStatusChange = async (docId, newStatus) => {
    try {
      const res = await api.put(`/api/documents/${docId}/drift-status`, { status: newStatus });
      setDocuments(documents.map(d => 
        d.id === docId ? { ...d, drift_status: newStatus } : d
      ));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Documents</h1>
          <p className="text-slate-400 mt-1">Manage knowledge base and reference links</p>
        </div>
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="bg-teal-600 hover:bg-teal-500 text-white px-5 py-2.5 rounded-lg font-medium transition-all shadow-lg shadow-teal-900/20 flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Upload Document
        </button>
      </div>

      {/* Category Manager */}
      <div className="mb-8">
        <CategoryManager 
          categories={categories}
          activeCategoryId={activeCategoryId}
          onSelectCategory={setActiveCategoryId}
          onCategoriesChange={setCategories}
          onDeleteCategory={setCatToDelete}
        />
      </div>

      {/* Document List Controls */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-slate-300 text-sm">
            <input 
              type="checkbox" 
              checked={documents.length > 0 && selectedDocs.size === documents.length}
              onChange={toggleAll}
              className="rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500/50"
            />
            <span>Select All</span>
          </label>
          
          {selectedDocs.size > 0 && (
            <button
              onClick={() => setShowBulkDelete(true)}
              className="text-sm text-rose-400 hover:text-rose-300 flex items-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" /> Delete ({selectedDocs.size})
            </button>
          )}
        </div>
        
        <div className="text-sm text-slate-500 font-medium">
          {documents.length} document{documents.length !== 1 && 's'}
        </div>
      </div>

      {/* Document Grid */}
      {isLoading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="lg" text="Loading documents..." />
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/30 border border-slate-700/50 rounded-xl border-dashed">
          <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
            <FileText className="w-8 h-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-medium text-slate-300 mb-1">No documents found</h3>
          <p className="text-slate-500 mb-6">Upload a PDF or link to get started.</p>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="text-teal-400 font-medium hover:text-teal-300"
          >
            + Upload your first document
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 fade-in">
          {documents.map(doc => (
            <div key={doc.id} className="relative group">
              <div className="absolute top-5 left-5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <input 
                  type="checkbox"
                  checked={selectedDocs.has(doc.id)}
                  onChange={() => toggleDocSelection(doc.id)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-teal-500 focus:ring-teal-500/50 cursor-pointer"
                />
              </div>
              <div className={selectedDocs.has(doc.id) ? 'ring-2 ring-teal-500/50 rounded-xl' : ''}>
                <DocumentCard 
                  document={doc} 
                  onDelete={setDocToDelete}
                  onStatusChange={handleStatusChange}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals & Dialogs */}
      <DocumentUploadModal 
        isOpen={isUploadModalOpen} 
        onClose={() => setIsUploadModalOpen(false)}
        categories={categories}
        onUploadSuccess={fetchData}
      />

      <ConfirmDialog
        isOpen={!!catToDelete}
        title="Delete Category?"
        message={`This will permanently delete the category "${catToDelete?.name}" AND ALL DOCUMENTS inside it. This action cannot be undone.`}
        confirmText="Yes, delete everything"
        variant="danger"
        requireTyping={catToDelete?.name}
        onConfirm={handleDeleteCategory}
        onCancel={() => setCatToDelete(null)}
      />

      <ConfirmDialog
        isOpen={!!docToDelete}
        title="Delete Document?"
        message={`Are you sure you want to delete "${docToDelete?.title}"? This will remove all associated AI chunks and embeddings.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDeleteDocument}
        onCancel={() => setDocToDelete(null)}
      />

      <ConfirmDialog
        isOpen={showBulkDelete}
        title="Bulk Delete Documents?"
        message={`Are you sure you want to delete ${selectedDocs.size} documents? This cannot be undone.`}
        confirmText={`Delete ${selectedDocs.size} items`}
        variant="danger"
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDelete(false)}
      />
    </div>
  );
}

// Added FileText component since it's used in empty state
const FileText = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><line x1="10" x2="8" y1="9" y2="9"/></svg>
);
