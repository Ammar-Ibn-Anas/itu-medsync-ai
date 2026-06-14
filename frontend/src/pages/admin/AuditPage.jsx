import React, { useState, useEffect } from 'react';
import { Play, ShieldAlert, CheckCircle, Clock, AlertTriangle, ArrowRight, ExternalLink, X, FileText } from 'lucide-react';
import api from '../../api';
import StatusBadge from '../../components/StatusBadge';
import { LoadingSpinner } from '../../components/shared';

export default function AuditPage() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  
  const [documents, setDocuments] = useState([]);
  const [allDocs, setAllDocs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, REQUIRES_ATTENTION, OUTDATED, OK

  // Manual audit states
  const [manualNoteId, setManualNoteId] = useState('');
  const [manualSourceId, setManualSourceId] = useState('');
  const [manualAuditResult, setManualAuditResult] = useState(null);
  const [isManualAuditing, setIsManualAuditing] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get('/api/documents');
      const allDocsList = res.data.documents || [];
      setAllDocs(allDocsList); // Store all docs for manual audit dropdowns
      // We only care about docs that have reference links for drift auditing
      setDocuments(allDocsList.filter(d => d.reference_links?.length > 0));
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRunGlobalAudit = async () => {
    setIsAuditing(true);
    setAuditResult(null);
    try {
      const res = await api.post('/api/audit/run-global');
      setAuditResult(res.data);
      fetchData(); // Refresh the list to show new statuses
    } catch (err) {
      alert("Audit failed: " + (err.response?.data?.detail || err.message));
    } finally {
      setIsAuditing(false);
    }
  };

  const filteredDocs = documents.filter(d => filter === 'ALL' || d.drift_status === filter);

  // Group docs by status for counts
  const counts = {
    ALL: documents.length,
    REQUIRES_ATTENTION: documents.filter(d => d.drift_status === 'REQUIRES_ATTENTION').length,
    OUTDATED: documents.filter(d => d.drift_status === 'OUTDATED').length,
    OK: documents.filter(d => d.drift_status === 'OK' || d.drift_status === 'FIXED').length
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-sm font-medium mb-4">
              <ShieldAlert className="w-4 h-4" />
              Knowledge Drift Detection
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">Global Knowledge Audit</h1>
            <p className="text-slate-300 leading-relaxed">
              Scan all monitored study notes against their tracked reference URLs. The AI engine will fetch the latest web content and compare it to your indexed documents to detect any contradictions, updated guidelines, or missing context.
            </p>
          </div>
          
          <div className="flex-shrink-0 w-full md:w-auto">
            <button
              onClick={handleRunGlobalAudit}
              disabled={isAuditing}
              className={`w-full md:w-auto relative group overflow-hidden rounded-xl p-0.5 transition-all focus:outline-none ${
                isAuditing ? 'opacity-75 cursor-not-allowed' : 'hover:scale-105 shadow-lg shadow-teal-900/50'
              }`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-500 rounded-xl animate-gradient-x opacity-70 group-hover:opacity-100 transition-opacity"></span>
              <div className="relative flex items-center justify-center gap-3 bg-slate-900 px-8 py-4 rounded-[10px] transition-all">
                {isAuditing ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="font-bold text-white tracking-wide">SCANNING ALL DOCS...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 text-teal-400 group-hover:text-teal-300 transition-colors" />
                    <span className="font-bold text-white tracking-wide">RUN GLOBAL AUDIT</span>
                  </>
                )}
              </div>
            </button>
            <p className="text-center text-xs text-slate-500 mt-3 font-medium">
              Takes ~10-30s per document depending on size.
            </p>
          </div>
        </div>

        {/* Audit Results Pop-in */}
        {auditResult && (
          <div className="mt-8 pt-6 border-t border-slate-700/50 slide-up flex flex-wrap gap-4 justify-center md:justify-start">
            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded text-blue-400"><FileText className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Checked</p>
                <p className="text-xl font-bold text-white">{auditResult.checked} Links</p>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700 flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded text-amber-400"><AlertTriangle className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Drift Found</p>
                <p className="text-xl font-bold text-amber-400">{auditResult.drift_detected} Docs</p>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg px-4 py-3 border border-slate-700 flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 rounded text-rose-400"><X className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Failed URLs</p>
                <p className="text-xl font-bold text-white">{auditResult.failed}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Audit Section */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-lg">
        <h2 className="text-xl font-bold text-white mb-4">🔍 Manual Document Comparison</h2>
        <p className="text-slate-300 text-sm mb-6">Compare any two documents chunk-by-chunk to find contradictions.</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Study Note (old material)</label>
            <select
              value={manualNoteId}
              onChange={(e) => setManualNoteId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
            >
              <option value="">-- Select Study Note --</option>
              {allDocs.filter(d => d.doc_type === 'study_note' && d.status === 'INDEXED').map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Trusted Source (new guideline)</label>
            <select
              value={manualSourceId}
              onChange={(e) => setManualSourceId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none"
            >
              <option value="">-- Select Trusted Source --</option>
              {allDocs.filter(d => d.doc_type === 'trusted_source' && d.status === 'INDEXED').map(d => (
                <option key={d.id} value={d.id}>{d.title}</option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={async () => {
            if (!manualNoteId || !manualSourceId) { alert('Select both documents first.'); return; }
            setIsManualAuditing(true);
            setManualAuditResult(null);
            try {
              const res = await api.post('/api/audit/run', {
                study_note_id: manualNoteId,
                trusted_source_id: manualSourceId
              });
              setManualAuditResult(res.data);
            } catch (err) {
              alert('Audit failed: ' + (err.response?.data?.detail || err.message));
            } finally {
              setIsManualAuditing(false);
            }
          }}
          disabled={isManualAuditing || !manualNoteId || !manualSourceId}
          className="bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
        >
          {isManualAuditing ? <> <span className="animate-spin">⟳</span> Running (~30s)... </> : '🔍 Compare Documents'}
        </button>

        {manualAuditResult && (
          <div className="mt-6 slide-up">
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-slate-400">🔴 Contradictions</p>
                  <p className="text-2xl font-bold text-red-500">{manualAuditResult.summary?.contradictions || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-400">🟡 Missing</p>
                  <p className="text-2xl font-bold text-yellow-500">{manualAuditResult.summary?.missing_context || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-slate-400">🟢 Aligned</p>
                  <p className="text-2xl font-bold text-green-500">{manualAuditResult.summary?.aligned || 0}</p>
                </div>
              </div>
            </div>

            {manualAuditResult.findings_summary?.map((f, i) => {
              const colors = { 
                Contradiction: 'border-l-red-500 bg-red-500/5', 
                'Missing Context': 'border-l-yellow-500 bg-yellow-500/5', 
                Aligned: 'border-l-green-500 bg-green-500/5' 
              };
              return (
                <div key={i} className={`border-l-4 rounded-lg p-4 mb-3 ${colors[f.status] || 'border-l-slate-500 bg-slate-900/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-white">Chunk #{i+1}</p>
                    <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-slate-700 text-slate-300">{f.status}</span>
                  </div>

                  <p className="text-sm text-slate-300 mb-2">{f.explanation}</p>

                  {f.specific_change && <p className="text-xs text-amber-400 flex items-start gap-2">⚠ {f.specific_change}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Monitored Documents Section */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Monitored Documents</h2>
            <p className="text-sm text-slate-400 mt-1">Showing only documents that have reference links.</p>
          </div>
          
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 w-full sm:w-auto overflow-x-auto dark-scroll">
            {[
              { id: 'ALL', label: 'All', count: counts.ALL },
              { id: 'REQUIRES_ATTENTION', label: 'Attention', count: counts.REQUIRES_ATTENTION, color: 'text-amber-400' },
              { id: 'OUTDATED', label: 'Outdated', count: counts.OUTDATED, color: 'text-rose-400' },
              { id: 'OK', label: 'OK/Fixed', count: counts.OK, color: 'text-emerald-400' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                  filter === f.id 
                    ? 'bg-slate-700 text-white shadow' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <span className={filter === f.id ? f.color : ''}>{f.label}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs ${filter === f.id ? 'bg-slate-600' : 'bg-slate-900'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner /></div>
        ) : filteredDocs.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/30 border border-slate-700/50 rounded-xl border-dashed text-slate-400">
            No documents found matching this filter.
          </div>
        ) : (
          <div className="space-y-4 fade-in">
            {filteredDocs.map(doc => (
              <AuditDocumentCard key={doc.id} document={doc} onUpdate={fetchData} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Sub-component for the audit list
function AuditDocumentCard({ document: doc, onUpdate }) {
  const [isExpanded, setIsExpanded] = useState(doc.drift_status === 'REQUIRES_ATTENTION');
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusUpdate = async (status) => {
    setIsUpdating(true);
    try {
      await api.put(`/api/documents/${doc.id}/drift-status`, { status });
      onUpdate(); // Refresh parent list
    } catch (err) {
      alert("Failed to update status");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={`bg-slate-800 border rounded-xl overflow-hidden transition-colors ${
      doc.drift_status === 'REQUIRES_ATTENTION' ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-slate-700'
    }`}>
      <div 
        className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/30 transition-colors ${
          isExpanded ? 'bg-slate-800/50 border-b border-slate-700' : ''
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <StatusBadge status={doc.drift_status} />
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white truncate">{doc.title}</h3>
            <p className="text-xs text-slate-500 flex items-center gap-3 mt-1">
              <span>{doc.reference_links?.length} tracked links</span>
              <span className="w-1 h-1 rounded-full bg-slate-600"></span>
              <span>Last Audited: {doc.last_audited_at ? new Date(doc.last_audited_at).toLocaleDateString() : 'Never'}</span>
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 text-slate-500">
          {/* Chevron */}
          <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {isExpanded && (
        <div className="p-5 slide-up bg-slate-900/30">
          {doc.drift_report ? (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Audit Findings</h4>
              
              {doc.drift_report.map((report, i) => (
                <div key={i} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                  <div className="px-4 py-2 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between">
                    <span className="font-medium text-slate-200 text-sm flex items-center gap-2">
                      <ExternalLink className="w-3.5 h-3.5 text-teal-500" />
                      {report.source}
                    </span>
                    <a href={report.url} target="_blank" rel="noreferrer" className="text-xs text-teal-500 hover:underline">
                      View Source
                    </a>
                  </div>
                  
                  <div className="p-4">
                    {report.error ? (
                      <p className="text-sm text-rose-400 flex items-start gap-2">
                        <X className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        Failed to fetch URL: {report.error}
                      </p>
                    ) : report.comparison ? (
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          {report.comparison.has_changes ? (
                            <div className="mt-0.5 p-1 bg-amber-500/20 text-amber-400 rounded"><AlertTriangle className="w-4 h-4" /></div>
                          ) : (
                            <div className="mt-0.5 p-1 bg-emerald-500/20 text-emerald-400 rounded"><CheckCircle className="w-4 h-4" /></div>
                          )}
                          <div>
                            <p className={`text-sm font-medium ${report.comparison.has_changes ? 'text-amber-300' : 'text-emerald-400'}`}>
                              {report.comparison.change_summary}
                            </p>
                            {report.comparison.has_changes && report.comparison.details && (
                              <p className="text-sm text-slate-400 mt-2 p-3 bg-slate-900 rounded border border-slate-700">
                                {report.comparison.details}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">No comparison data available.</p>
                    )}
                  </div>
                </div>
              ))}

              {/* Action Buttons */}
              {doc.drift_status === 'REQUIRES_ATTENTION' && (
                <div className="flex items-center gap-3 pt-4 mt-4 border-t border-slate-700">
                  <span className="text-sm text-slate-400">Mark this document as:</span>
                  <button
                    onClick={() => handleStatusUpdate('FIXED')}
                    disabled={isUpdating}
                    className="px-4 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> Fixed & Updated
                  </button>
                  <button
                    onClick={() => handleStatusUpdate('OUTDATED')}
                    disabled={isUpdating}
                    className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" /> Will Fix Later
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-sm italic">
              This document has not been audited yet. Run a global audit to check it.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
