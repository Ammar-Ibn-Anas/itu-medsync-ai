import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileText, Link as LinkIcon, BookOpen, ExternalLink, Calendar, ShieldCheck } from 'lucide-react';
import api from '../../api';
import { LoadingSpinner } from '../../components/shared';

export default function DocumentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDoc = async () => {
      try {
        const res = await api.get(`/api/public/documents/${id}`);
        setDoc(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || "Document not found");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDoc();
  }, [id]);

  const handleDownload = () => {
    window.location.href = `${api.defaults.baseURL}/api/public/documents/${id}/download`;
  };

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <LoadingSpinner size="lg" text="Loading document..." />
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
          
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
            {doc.title}
          </h1>
          
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
