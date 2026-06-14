import { useState, useEffect } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'
const STORAGE_KEY = 'medsync_bookmarks'

export default function StudentPortal() {
  const [query, setQuery] = useState('')
  const [docType, setDocType] = useState('study_note')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searched, setSearched] = useState(false)

  const [bookmarks, setBookmarks] = useState([])
  const [showBookmarks, setShowBookmarks] = useState(false)

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
      setBookmarks(saved)
    } catch {
      setBookmarks([])
    }
  }, [])

  function saveBookmarks(updated) {
    setBookmarks(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  function isBookmarked(chunk_text) {
    return bookmarks.some(b => b.chunk_text === chunk_text)
  }

  function toggleBookmark(result) {
    if (isBookmarked(result.chunk_text)) {
      saveBookmarks(bookmarks.filter(b => b.chunk_text !== result.chunk_text))
    } else {
      saveBookmarks([...bookmarks, { chunk_text: result.chunk_text, doc_title: result.doc_title, saved_at: new Date().toISOString() }])
    }
  }

  function removeBookmark(chunk_text) {
    saveBookmarks(bookmarks.filter(b => b.chunk_text !== chunk_text))
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    setResults([])
    setSearched(true)
    setShowBookmarks(false)

    try {
      const res = await axios.get(`${API}/api/search`, {
        params: { query: query.trim(), doc_type: docType }
      })
      setResults(res.data.results || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Search failed. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Search bar */}
      <section className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">🔎 Search Medical Knowledge Base</h2>
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. treatment for scabies, antibiotic dosage..."
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={docType}
              onChange={e => setDocType(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none"
            >
              <option value="study_note">Study Notes</option>
              <option value="trusted_source">Trusted Sources</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400 text-white px-5 py-2 rounded text-sm font-medium transition-colors whitespace-nowrap"
            >
              {loading ? '⏳...' : 'Search'}
            </button>
          </div>
        </form>

        {/* Bookmarks toggle */}
        <div className="mt-3">
          <button
            onClick={() => setShowBookmarks(!showBookmarks)}
            className="text-sm text-blue-600 hover:underline"
          >
            🔖 My Bookmarks ({bookmarks.length})
          </button>
        </div>
      </section>

      {/* Bookmarks panel */}
      {showBookmarks && (
        <section className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-gray-800 mb-3">🔖 Saved Bookmarks</h3>
          {bookmarks.length === 0 ? (
            <p className="text-sm text-gray-500">No bookmarks yet. Search for something and save results.</p>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((b, i) => (
                <div key={i} className="border border-gray-200 rounded p-3 bg-gray-50">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-blue-700 mb-1">{b.doc_title}</p>
                      <p className="text-sm text-gray-700">{b.chunk_text}</p>
                      <p className="text-xs text-gray-400 mt-1">Saved {new Date(b.saved_at).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => removeBookmark(b.chunk_text)}
                      className="text-xs text-red-500 hover:text-red-700 whitespace-nowrap"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-300 rounded text-sm text-red-800">
          ❌ {error}
        </div>
      )}

      {/* Results */}
      {searched && !loading && (
        <section className="space-y-3">
          {results.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500 text-sm">
              No results found. Try different search terms.
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">{results.length} result{results.length !== 1 ? 's' : ''} found</p>
              {results.map((r, i) => (
                <div key={i} className="bg-white rounded-xl shadow p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-blue-700 mb-1 uppercase tracking-wide">
                        {r.doc_title}
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed">{r.chunk_text}</p>
                      {r.distance != null && (
                        <p className="text-xs text-gray-400 mt-2">
                          Relevance score: {(1 - r.distance).toFixed(3)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => toggleBookmark(r)}
                      className={`whitespace-nowrap text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
                        isBookmarked(r.chunk_text)
                          ? 'bg-yellow-100 border-yellow-400 text-yellow-800'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {isBookmarked(r.chunk_text) ? '🔖 Saved' : '+ Bookmark'}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      )}
    </div>
  )
}
