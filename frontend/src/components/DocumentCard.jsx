import React, { useState, useEffect, useRef } from 'react';
import { Download, Edit2, Check, X, FileText, Activity } from 'lucide-react';
import api from '../api';
import StatusBadge from './StatusBadge';
import ReferenceLinkEditor from './ReferenceLinkEditor';
import { LoadingSpinner } from './shared';

export default function DocumentCard({ 
  document: initialDoc, 
  categories = [],
  onRefresh,
  onDelete, 
  onStatusChange 
}) {
  const [doc, setDoc] = useState(initialDoc);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Edit states
  const [title, setTitle] = useState(doc.title);
  const [summary, setSummary] = useState(doc.summary || '');
  const [links, setLinks] = useState(doc.reference_links || []);
  const [driftStatus, setDriftStatus] = useState(doc.drift_status || 'OK');
  const [categoryId, setCategoryId] = useState(doc.category_id || '');

  const fileInputRef = useRef(null);
  const [isReplacing, setIsReplacing] = useState(false);
  const [isAuditingLinks, setIsAuditingLinks] = useState(false);

  // Sync if prop changes
  useEffect(() => {
    setDoc(initialDoc);
    setTitle(initialDoc.title);
    setSummary(initialDoc.summary || '');
    setLinks(initialDoc.reference_links || []);
    setDriftStatus(initialDoc.drift_status || 'OK');
    setCategoryId(initialDoc.category_id || '');
  }, [initialDoc]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await api.put(`/api/documents/${doc.id}`, {
        title,
        summary,
        reference_links: links,
        drift_status: driftStatus,
        category_id: categoryId || null
      });
      const categoryObj = categories.find(c => c.id === categoryId);
      const updatedDoc = { ...res.data };
      if (categoryObj) updatedDoc.categories = categoryObj;
      
      setDoc(updatedDoc);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to save", err);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAuditLinks = async () => {
    setIsAuditingLinks(true);
    try {
      const res = await api.post(`/api/audit/document/${doc.id}`);
      if (onRefresh) onRefresh();
      alert(`Audit complete! ${res.data.drift_found ? "Drift detected." : "No drift found."}`);
    } catch (err) {
      console.error(err);
      alert("Audit failed.");
    } finally {
      setIsAuditingLinks(false);
    }
  };

  const handleReplace = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsReplacing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      await api.post(`/api/documents/${doc.id}/replace`, formData);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Failed to replace", err);
      alert("Failed to replace document.");
    } finally {
      setIsReplacing(false);
      e.target.value = null;
    }
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(`/api/documents/${doc.id}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Download failed. PDF may not be stored for this document.');
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-lg overflow-hidden transition-all hover:border-slate-600">
      {/* Header */}
      <div className="p-5 border-b border-slate-700 bg-slate-800/50 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${
              doc.doc_type === 'trusted_source' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
            }`}>
              {doc.doc_type === 'trusted_source' ? 'Trusted Source' : 'Study Note'}
            </span>
            {isEditing ? (
              <select
                value={categoryId}
                onChange={e => setCategoryId(e.target.value)}
                className="text-xs bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">Uncategorized</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <FileText className="w-3 h-3" /> {doc.categories?.name || 'Uncategorized'}
              </span>
            )}
            <StatusBadge status={isEditing ? driftStatus : doc.drift_status} className="ml-auto" />
          </div>
          
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-white font-semibold focus:outline-none focus:border-teal-500"
            />
          ) : (
            <h3 className="text-lg font-bold text-white truncate" title={doc.title}>{doc.title}</h3>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditing ? (
            <>
              <button onClick={() => setIsEditing(false)} className="p-1.5 text-slate-400 hover:bg-slate-700 rounded-lg transition-colors">
                <X className="w-4 h-4" />
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {isSaving ? <LoadingSpinner size="sm" /> : <Check className="w-3.5 h-3.5" />} Save
              </button>
            </>
          ) : (
            <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-400 hover:bg-slate-700 hover:text-white rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-5 space-y-5">
        
        {/* Status override when editing */}
        {isEditing && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Override Status</label>
            <select
              value={driftStatus}
              onChange={e => setDriftStatus(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 appearance-none"
            >
              <option value="OK">OK (Verified)</option>
              <option value="REQUIRES_ATTENTION">Requires Attention</option>
              <option value="OUTDATED">Outdated (Will fix later)</option>
              <option value="FIXED">Fixed</option>
            </select>
          </div>
        )}

        {/* Drift Report display if exists and not OK */}
        {!isEditing && doc.drift_status === 'REQUIRES_ATTENTION' && doc.drift_report && (
          <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            <h4 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5 mb-2 uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5" /> Latest Audit Findings
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto dark-scroll pr-1">
              {Array.isArray(doc.drift_report) && doc.drift_report.filter(r => r.comparison?.has_changes).map((report, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium text-slate-300">{report.source}:</span>{' '}
                  <span className="text-amber-200/80">{report.comparison.change_summary}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button 
                onClick={() => onStatusChange(doc.id, 'FIXED')}
                className="px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded transition-colors"
              >
                Mark Fixed
              </button>
              <button 
                onClick={() => onStatusChange(doc.id, 'OUTDATED')}
                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-medium rounded transition-colors"
              >
                Mark Outdated
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Summary */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Summary</h4>
            {isEditing ? (
              <textarea
                value={summary}
                onChange={e => setSummary(e.target.value)}
                rows={5}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-teal-500 resize-none dark-scroll"
                placeholder="No summary provided..."
              />
            ) : (
              <p className="text-sm text-slate-300 line-clamp-5 leading-relaxed bg-slate-900/30 p-3 rounded-lg border border-slate-800 h-[120px]">
                {doc.summary || <span className="text-slate-500 italic">No summary generated. Edit to add one.</span>}
              </p>
            )}
          </div>

          {/* Links */}
          <div className={isEditing ? "" : "h-[120px] overflow-y-auto dark-scroll"}>
            {isEditing ? (
              <ReferenceLinkEditor links={links} onChange={setLinks} />
            ) : (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider sticky top-0 bg-slate-800 pb-1">References</h4>
                {doc.reference_links?.length > 0 ? (
                  <ul className="space-y-1.5">
                    {doc.reference_links.map((link, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <span className="text-teal-500 mt-1">•</span>
                        {link.url ? (
                          <a href={link.url} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-teal-400 hover:underline transition-colors leading-snug break-words">
                            {link.name}
                          </a>
                        ) : (
                          <span className="text-slate-300 leading-snug">{link.name}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic bg-slate-900/30 p-3 rounded-lg border border-slate-800">No references tracked.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex items-center justify-between">
        <div className="text-xs text-slate-500">
          Updated: {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
        </div>
        <div className="flex gap-2 items-center">
          {!isEditing && (
            <>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleReplace} 
                className="hidden" 
                accept=".pdf" 
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isReplacing || isAuditingLinks}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
              >
                {isReplacing ? 'Replacing...' : 'Replace PDF'}
              </button>
              {doc.reference_links?.length > 0 && (
                <button
                  onClick={handleAuditLinks}
                  disabled={isAuditingLinks || isReplacing}
                  className="px-3 py-1.5 text-xs font-medium text-teal-400 hover:text-teal-300 hover:bg-teal-500/10 rounded transition-colors disabled:opacity-50"
                >
                  {isAuditingLinks ? 'Auditing...' : 'Check Links'}
                </button>
              )}
              <button
                onClick={() => onDelete(doc)}
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
              >
                Delete
              </button>
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
