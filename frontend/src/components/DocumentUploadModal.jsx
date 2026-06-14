import React, { useState } from 'react';
import { Upload, Link as LinkIcon, FileText, X, Sparkles, Loader2 } from 'lucide-react';
import api from '../../api';

export default function DocumentUploadModal({ isOpen, onClose, categories, onUploadSuccess }) {
  const [mode, setMode] = useState('file'); // 'file' | 'url'
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('study_note');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  
  // Post-upload state
  const [uploadResult, setUploadResult] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  if (!isOpen) return null;

  const resetState = () => {
    setTitle('');
    setDocType('study_note');
    setCategoryId('');
    setFile(null);
    setUrl('');
    setError(null);
    setUploadResult(null);
    setScanResult(null);
  };

  const handleClose = () => {
    if (uploadResult) {
      onUploadSuccess();
    }
    resetState();
    onClose();
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('doc_type', docType);
      if (categoryId) formData.append('category_id', categoryId);

      let res;
      if (mode === 'file') {
        if (!file) throw new Error('Please select a PDF file.');
        formData.append('file', file);
        res = await api.post('/api/documents/upload', formData);
      } else {
        if (!url) throw new Error('Please enter a URL.');
        formData.append('url', url);
        res = await api.post('/api/documents/upload-url', formData);
      }

      setUploadResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleScanReferences = async () => {
    setIsScanning(true);
    try {
      const res = await api.post(`/api/documents/${uploadResult.doc_id}/scan-references`);
      setScanResult(res.data.references || []);
    } catch (err) {
      setError("Failed to scan references: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsScanning(false);
    }
  };

  const handleGenerateSummary = async () => {
    setIsSummarizing(true);
    try {
      await api.post(`/api/documents/${uploadResult.doc_id}/generate-summary`);
      // We don't need to show it here, it will be visible in the detail view
    } catch (err) {
      setError("Failed to generate summary: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm fade-in dark-scroll overflow-y-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-2xl w-full my-auto slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between sticky top-0 bg-slate-800 rounded-t-xl z-10">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Upload className="w-5 h-5 text-teal-400" />
            Upload Document
          </h2>
          <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/50 text-rose-400 text-sm">
              {error}
            </div>
          )}

          {!uploadResult ? (
            /* UPLOAD FORM */
            <form onSubmit={handleUpload} className="space-y-6">
              
              {/* Type Toggle */}
              <div className="flex p-1 bg-slate-900 rounded-lg">
                <button
                  type="button"
                  onClick={() => setMode('file')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    mode === 'file' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-4 h-4 inline-block mr-2" /> PDF File
                </button>
                <button
                  type="button"
                  onClick={() => setMode('url')}
                  className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                    mode === 'url' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LinkIcon className="w-4 h-4 inline-block mr-2" /> URL Link
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Document Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Scabies Treatment Guidelines 2024"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Document Type</label>
                  <select
                    value={docType}
                    onChange={e => setDocType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                  >
                    <option value="study_note">Study Note (Monitored)</option>
                    <option value="trusted_source">Trusted Source (Reference)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Category</label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
                  >
                    <option value="">-- No Category --</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {mode === 'file' ? (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">PDF File</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-700 border-dashed rounded-lg hover:border-teal-500/50 transition-colors bg-slate-900/50">
                    <div className="space-y-1 text-center">
                      <FileText className="mx-auto h-12 w-12 text-slate-500" />
                      <div className="flex text-sm text-slate-400 justify-center">
                        <label className="relative cursor-pointer rounded-md font-medium text-teal-400 hover:text-teal-300 focus-within:outline-none">
                          <span>Upload a file</span>
                          <input type="file" className="sr-only" accept=".pdf" onChange={e => setFile(e.target.files[0])} />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-slate-500">PDF up to 50MB</p>
                      {file && <p className="text-sm font-medium text-teal-400 mt-2">{file.name}</p>}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Document URL</label>
                  <input
                    type="url"
                    required
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://example.com/guideline"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {isUploading ? 'Uploading & Indexing...' : 'Upload Document'}
                </button>
              </div>
            </form>
          ) : (
            /* POST UPLOAD OPTIONS */
            <div className="space-y-6 slide-up">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-start gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-full text-emerald-400 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-emerald-400 font-medium">Upload Complete!</h3>
                  <p className="text-sm text-slate-300 mt-1">
                    Document indexed into {uploadResult.chunks_created} searchable chunks.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">AI Enhancements</h4>
                
                <div className="p-5 border border-slate-700 rounded-lg bg-slate-900/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Scan for Reference Links
                      </h5>
                      <p className="text-sm text-slate-400 mt-1 max-w-md">
                        Have AI read the document and automatically extract URLs and referenced guidelines to monitor for drift.
                      </p>
                    </div>
                    <button
                      onClick={handleScanReferences}
                      disabled={isScanning || scanResult}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      {scanResult ? 'Scanned' : 'Scan Now'}
                    </button>
                  </div>
                  
                  {scanResult && (
                    <div className="mt-4 pt-4 border-t border-slate-700">
                      <p className="text-sm text-emerald-400 mb-2">Found {scanResult.length} references:</p>
                      <ul className="text-sm text-slate-300 space-y-1 pl-4 list-disc">
                        {scanResult.map((r, i) => (
                          <li key={i}>{r.name} {r.url ? `(${r.url})` : ''}</li>
                        ))}
                        {scanResult.length === 0 && <li>No references found in document text.</li>}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="p-5 border border-slate-700 rounded-lg bg-slate-900/50">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        Generate AI Summary
                      </h5>
                      <p className="text-sm text-slate-400 mt-1 max-w-md">
                        Create a concise medical summary for students reading this document.
                      </p>
                    </div>
                    <button
                      onClick={handleGenerateSummary}
                      disabled={isSummarizing}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-sm font-medium text-white transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSummarizing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Generate
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-700">
                <button
                  onClick={handleClose}
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Need to define CheckCircle2 locally since I forgot to import it in the component above
const CheckCircle2 = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/>
  </svg>
);
