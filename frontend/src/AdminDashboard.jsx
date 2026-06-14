import { useState, useEffect } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

// Reusable status badge
function StatusBadge({ status }) {
  const colors = {
    Contradiction: 'bg-red-100 text-red-800 border-red-300',
    'Missing Context': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    Aligned: 'bg-green-100 text-green-800 border-green-300',
  }
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${colors[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  )
}

// Color-coded finding card
function FindingCard({ finding, index }) {
  const bg = {
    Contradiction: 'border-l-4 border-red-500 bg-red-50',
    'Missing Context': 'border-l-4 border-yellow-500 bg-yellow-50',
    Aligned: 'border-l-4 border-green-500 bg-green-50',
  }
  return (
    <div className={`p-4 rounded ${bg[finding.status] || 'bg-gray-50 border-l-4 border-gray-400'}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs text-gray-500 font-mono">Chunk #{index + 1}</span>
        <StatusBadge status={finding.status} />
      </div>
      <p className="text-sm text-gray-800 mt-1">{finding.explanation}</p>
      {finding.specific_change && (
        <p className="text-xs text-red-700 mt-1 italic">⚠ {finding.specific_change}</p>
      )}
    </div>
  )
}

export default function AdminDashboard() {
  const [documents, setDocuments] = useState([])

  // Upload state
  const [uploadMode, setUploadMode] = useState('file') // 'file' | 'url'
  const [uploadTitle, setUploadTitle] = useState('')
  const [uploadDocType, setUploadDocType] = useState('study_note')
  const [uploadFile, setUploadFile] = useState(null)
  const [uploadUrl, setUploadUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)

  // Audit state
  const [auditNoteId, setAuditNoteId] = useState('')
  const [auditSourceId, setAuditSourceId] = useState('')
  const [auditing, setAuditing] = useState(false)
  const [auditResult, setAuditResult] = useState(null)
  const [auditError, setAuditError] = useState(null)

  // Fetch docs list on mount so we can populate dropdowns
  useEffect(() => {
    axios.get(`${API}/api/documents`).then(r => setDocuments(r.data.documents || [])).catch(() => {})
  }, [uploadResult]) // re-fetch after a successful upload

  async function handleUpload(e) {
    e.preventDefault()
    setUploadResult(null)
    setUploadError(null)
    setUploading(true)

    try {
      const form = new FormData()
      form.append('title', uploadTitle)
      form.append('doc_type', uploadDocType)

      let res
      if (uploadMode === 'file') {
        if (!uploadFile) throw new Error('Please select a PDF file.')
        form.append('file', uploadFile)
        res = await axios.post(`${API}/api/documents/upload`, form)
      } else {
        if (!uploadUrl.trim()) throw new Error('Please enter a URL.')
        form.append('url', uploadUrl.trim())
        res = await axios.post(`${API}/api/documents/upload-url`, form)
      }

      setUploadResult(res.data)
      setUploadTitle('')
      setUploadFile(null)
      setUploadUrl('')
    } catch (err) {
      setUploadError(err.response?.data?.detail || err.message)
    } finally {
      setUploading(false)
    }
  }

  async function handleAudit(e) {
    e.preventDefault()
    setAuditResult(null)
    setAuditError(null)
    setAuditing(true)

    try {
      const res = await axios.post(
        `${API}/api/audit/run?study_note_id=${auditNoteId}&trusted_source_id=${auditSourceId}`
      )
      setAuditResult(res.data)
    } catch (err) {
      setAuditError(err.response?.data?.detail || err.message)
    } finally {
      setAuditing(false)
    }
  }

  const studyNotes = documents.filter(d => d.doc_type === 'study_note')
  const trustedSources = documents.filter(d => d.doc_type === 'trusted_source')

  return (
    <div className="space-y-8">

      {/* ── SECTION 1: UPLOAD ── */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">📄 Upload Document</h2>

        {/* Toggle: File vs URL */}
        <div className="flex gap-2 mb-4">
          {['file', 'url'].map(m => (
            <button
              key={m}
              onClick={() => setUploadMode(m)}
              className={`px-4 py-1.5 rounded text-sm font-medium border transition-colors ${
                uploadMode === m
                  ? 'bg-blue-700 text-white border-blue-700'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {m === 'file' ? '📁 Upload PDF' : '🔗 Paste URL'}
            </button>
          ))}
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Title</label>
              <input
                type="text"
                required
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
                placeholder="e.g. Scabies Treatment Guidelines 2024"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
              <select
                value={uploadDocType}
                onChange={e => setUploadDocType(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="study_note">Study Note (old material)</option>
                <option value="trusted_source">Trusted Source (new guideline)</option>
              </select>
            </div>
          </div>

          {uploadMode === 'file' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PDF File</label>
              <input
                type="file"
                accept=".pdf"
                required
                onChange={e => setUploadFile(e.target.files[0])}
                className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document URL</label>
              <input
                type="url"
                required
                value={uploadUrl}
                onChange={e => setUploadUrl(e.target.value)}
                placeholder="https://example.com/guideline.pdf  or  https://example.com/article"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Direct PDF links and article pages both work. If the site blocks access, download the PDF and use the file upload instead.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={uploading}
            className="bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white px-5 py-2 rounded text-sm font-medium transition-colors"
          >
            {uploading ? '⏳ Processing...' : 'Upload & Index'}
          </button>
        </form>

        {uploadResult && (
          <div className="mt-4 p-3 bg-green-50 border border-green-300 rounded text-sm text-green-800">
            ✅ <strong>{uploadResult.message}</strong> — Doc ID: <code className="font-mono text-xs bg-green-100 px-1 rounded">{uploadResult.doc_id}</code> | Chunks: {uploadResult.chunks_created}
          </div>
        )}
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded text-sm text-red-800">
            ❌ {uploadError}
          </div>
        )}
      </section>

      {/* ── SECTION 2: AUDIT ── */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-1">🔍 Run Knowledge Drift Audit</h2>
        <p className="text-sm text-gray-500 mb-4">Select a study note and a trusted source to compare them for contradictions.</p>

        <form onSubmit={handleAudit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Study Note</label>
              {studyNotes.length > 0 ? (
                <select
                  value={auditNoteId}
                  onChange={e => setAuditNoteId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select study note --</option>
                  {studyNotes.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Paste Study Note Doc ID"
                  value={auditNoteId}
                  onChange={e => setAuditNoteId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trusted Source</label>
              {trustedSources.length > 0 ? (
                <select
                  value={auditSourceId}
                  onChange={e => setAuditSourceId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select trusted source --</option>
                  {trustedSources.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Paste Trusted Source Doc ID"
                  value={auditSourceId}
                  onChange={e => setAuditSourceId(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={auditing}
            className="bg-purple-700 hover:bg-purple-800 disabled:bg-purple-400 text-white px-5 py-2 rounded text-sm font-medium transition-colors"
          >
            {auditing ? '⏳ Auditing (this takes ~30s)...' : '🚀 Run Audit'}
          </button>
        </form>

        {auditError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-300 rounded text-sm text-red-800">
            ❌ {auditError}
          </div>
        )}

        {auditResult && (
          <div className="mt-6 space-y-4">
            {/* Summary bar */}
            <div className="flex gap-3 flex-wrap">
              <div className="px-3 py-1.5 bg-red-100 text-red-800 rounded text-sm font-medium">
                🔴 Contradictions: {auditResult.summary.contradictions}
              </div>
              <div className="px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded text-sm font-medium">
                🟡 Missing Context: {auditResult.summary.missing_context}
              </div>
              <div className="px-3 py-1.5 bg-green-100 text-green-800 rounded text-sm font-medium">
                🟢 Aligned: {auditResult.summary.aligned}
              </div>
            </div>

            {/* Individual findings */}
            <div className="space-y-3">
              {auditResult.findings_summary.map((f, i) => (
                <FindingCard key={i} finding={f} index={i} />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION 3: DOC LIST ── */}
      {documents.length > 0 && (
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📚 Indexed Documents</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2 pr-4">Title</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 font-mono text-xs">ID</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(d => (
                  <tr key={d.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 pr-4 font-medium text-gray-800">{d.title}</td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${d.doc_type === 'trusted_source' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {d.doc_type === 'trusted_source' ? 'Trusted Source' : 'Study Note'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`text-xs px-2 py-0.5 rounded ${d.status === 'INDEXED' ? 'bg-green-100 text-green-700' : d.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2 font-mono text-xs text-gray-400 truncate max-w-[180px]" title={d.id}>
                      {d.id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
