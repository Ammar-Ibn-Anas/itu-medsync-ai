import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Link as LinkIcon, BookOpen, ExternalLink, Calendar, ShieldCheck, Bookmark } from 'lucide-react';
import api from '../../api';
import { LoadingSpinner } from '../../components/shared';

export default function DocumentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [previewChunks, setPreviewChunks] = useState([]);
  const [pdfBlobUrl, setPdfBlobUrl] = useState(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let currentPdfUrl = null;
    const fetchDoc = async () => {
      try {
        const [docRes, previewRes] = await Promise.all([
          api.get(`/api/public/documents/${id}`),
          api.get(`/api/public/documents/${id}/preview`)
        ]);
        setDoc(docRes.data);
        setPreviewChunks(previewRes.data.chunks || []);
        
        const saved = JSON.parse(localStorage.getItem('medsync_bookmarks') || '[]');
        setIsBookmarked(saved.some(b => b.id === id));
        
        try {
          const pdfRes = await api.get(`/api/public/documents/${id}/download`, { responseType: 'blob' });
          currentPdfUrl = window.URL.createObjectURL(new Blob([pdfRes.data], { type: 'application/pdf' }));
          setPdfBlobUrl(currentPdfUrl);
        } catch (pdfErr) {
          console.warn('PDF not available for embed');
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Document not found");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoc();
    
    return () => {
      if (currentPdfUrl) window.URL.revokeObjectURL(currentPdfUrl);
    };
  }, [id]);

  const toggleBookmark = () => {
    const saved = JSON.parse(localStorage.getItem('medsync_bookmarks') || '[]');
    if (isBookmarked) {
      const updated = saved.filter(b => b.id !== id);
      localStorage.setItem('medsync_bookmarks', JSON.stringify(updated));
      setIsBookmarked(false);
    } else {
      saved.push({
        id: id,
        title: doc.title,
        summary: doc.summary,
        category: doc.categories?.name || 'Uncategorized'
      });
      localStorage.setItem('medsync_bookmarks', JSON.stringify(saved));
      setIsBookmarked(true);
    }
    window.dispatchEvent(new Event('bookmarks_updated'));
  };

  const handleDownload = async () => {
    try {
      const response = await api.get(`/api/public/documents/${id}/download`, {
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
      alert('Download failed.');
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="animate-pulse space-y-6">
          {/* Back button skeleton */}
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          
          {/* Header skeleton */}
          <div className="bg-slate-50 rounded-2xl p-10 space-y-4">
            <div className="flex gap-3">
              <div className="h-6 bg-slate-200 rounded w-24"></div>
              <div className="h-6 bg-slate-200 rounded w-32"></div>
            </div>
            <div className="h-12 bg-slate-200 rounded w-3/4"></div>
            <div className="flex gap-6">
              <div className="h-4 bg-slate-200 rounded w-40"></div>
              <div className="h-4 bg-slate-200 rounded w-32"></div>
            </div>
          </div>
          
          {/* Content skeleton */}
          <div className="space-y-8">
            <div>
              <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
              <div className="space-y-3">
                <div className="h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                <div className="h-4 bg-slate-200 rounded w-4/6"></div>
              </div>
            </div>
            <div>
              <div className="h-6 bg-slate-200 rounded w-48 mb-4"></div>
              <div className="bg-slate-50 rounded-xl p-6 space-y-3">
                <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="max-w-3xl mx-auto mt-12 p-8 bg-white rounded-xl shadow-sm border border-rose-200 text-center">
        <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileText className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Document Not Found</h2>
        <p className="text-slate-600 mb-6">{error}</p>
        <button 
          onClick={() => navigate(-1)}
          className="px-6 py-2 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 fade-in">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-800 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to browse
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-8 md:p-10 border-b border-slate-100 bg-slate-50">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-teal-700 bg-teal-100 px-3 py-1 rounded-md">
              {doc.categories?.name || 'Uncategorized'}
            </span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-3 py-1 rounded-md flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Knowledge
            </span>
          </div>
          
          <div className="flex items-start justify-between gap-4 mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight tracking-tight flex-1">
              {doc.title}
            </h1>
            <button
              onClick={toggleBookmark}
              className={`p-3 rounded-xl transition-all ${
                isBookmarked 
                  ? 'bg-teal-100 text-teal-700 hover:bg-teal-200' 
                  : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
              }`}
              title={isBookmarked ? "Remove Bookmark" : "Add Bookmark"}
            >
              <Bookmark className={`w-6 h-6 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>
          </div>
          
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Last updated: {new Date(doc.updated_at || doc.created_at).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric'
              })}
            </div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              MedSync Verified
            </div>
          </div>
        </div>

        <div className="p-8 md:p-10 space-y-12">
          {/* Summary Section */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <FileText className="w-5 h-5 text-teal-600" /> Executive Summary
            </h2>
            {doc.summary ? (
              <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:text-slate-700">
                {doc.summary.split('\n').map((paragraph, idx) => (
                  paragraph.trim() && <p key={idx}>{paragraph}</p>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 italic bg-slate-50 p-6 rounded-xl border border-slate-100">
                No summary available for this document.
              </p>
            )}
          </section>

          {/* Document Content Section */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <BookOpen className="w-5 h-5 text-teal-600" /> Document Content
            </h2>
            
            {pdfBlobUrl ? (
              <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-200 shadow-inner" style={{ height: '700px' }}>
                <object data={pdfBlobUrl} type="application/pdf" width="100%" height="100%">
                  <p className="p-6 text-white">Your browser doesn't support PDF viewing. <a href={pdfBlobUrl} className="text-teal-400 underline">Download the PDF</a> instead.</p>
                </object>
              </div>
            ) : previewChunks.length > 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
                <div className="prose prose-slate max-w-none prose-p:leading-relaxed prose-p:text-slate-700">
                  {previewChunks.map((chunk, idx) => (
                    <p key={idx} className="mb-4">{chunk}</p>
                  ))}
                  {previewChunks.length >= 10 && (
                    <div className="mt-6 p-4 bg-slate-50 rounded-lg text-center text-slate-500 italic border border-slate-100">
                      Preview limited to first few sections. Download PDF to read the full document.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-500 italic bg-slate-50 p-6 rounded-xl border border-slate-100">
                No content preview available for this document.
              </p>
            )}
          </section>

          {/* Reference Links Section */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
              <LinkIcon className="w-5 h-5 text-teal-600" /> Source References
            </h2>
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-6">
              {doc.reference_links && doc.reference_links.length > 0 ? (
                <ul className="space-y-3">
                  {doc.reference_links.map((link, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="mt-1 bg-white p-1 rounded-md border border-slate-200 shadow-sm">
                        <ExternalLink className="w-4 h-4 text-slate-400" />
                      </div>
                      <div>
                        {link.url ? (
                          <a 
                            href={link.url} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-base font-semibold text-teal-700 hover:text-teal-600 hover:underline transition-colors block"
                          >
                            {link.name}
                          </a>
                        ) : (
                          <span className="text-base font-semibold text-slate-700 block">{link.name}</span>
                        )}
                        <span className="text-xs text-slate-500 mt-0.5 block">Continuously audited for drift</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-500 italic text-sm">No external references are tracked for this document.</p>
              )}
            </div>
          </section>
          
          {/* Action Footer */}
          <section className="flex justify-center pt-8 border-t border-slate-100">
            <button
              onClick={handleDownload}
              className="group relative flex items-center justify-center gap-3 bg-slate-900 hover:bg-teal-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-teal-600/30 w-full md:w-auto overflow-hidden"
            >
              <span className="absolute inset-0 w-full h-full bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></span>
              <Download className="w-6 h-6 relative z-10" />
              <span className="relative z-10">Download Original PDF</span>
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
