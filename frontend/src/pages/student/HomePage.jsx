import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Search, BookOpen, FolderOpen, ArrowRight, Bookmark as BookmarkIcon, CheckCircle } from 'lucide-react';
import api from '../../api';
import { LoadingSpinner } from '../../components/shared';

export default function HomePage() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const [bookmarks, setBookmarks] = useState([]);
  const [sortBy, setSortBy] = useState('newest');

  useEffect(() => {
    // Load bookmarks
    try {
      const saved = JSON.parse(localStorage.getItem('medsync_bookmarks') || '[]');
      setBookmarks(saved);
    } catch (e) {
      setBookmarks([]);
    }

    // Load data
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [catsRes, docsRes] = await Promise.all([
          api.get('/api/public/categories'),
          api.get(categoryId ? `/api/public/documents?category_id=${categoryId}` : '/api/public/documents')
        ]);
        setCategories(catsRes.data);
        setDocuments(docsRes.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [categoryId]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    
    setIsSearching(true);
    try {
      const res = await api.get(`/api/public/search?query=${encodeURIComponent(searchQuery)}&limit=10`);
      setSearchResults(res.data.results || []);
    } catch (err) {
      console.error(err);
      alert("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const isBookmarked = (chunk_text) => bookmarks.some(b => b.chunk_text === chunk_text);

  const toggleBookmark = (result) => {
    let updated;
    if (isBookmarked(result.chunk_text)) {
      updated = bookmarks.filter(b => b.chunk_text !== result.chunk_text);
    } else {
      updated = [...bookmarks, { 
        chunk_text: result.chunk_text, 
        doc_title: result.doc_title, 
        document_id: result.document_id,
        saved_at: new Date().toISOString() 
      }];
    }
    setBookmarks(updated);
    localStorage.setItem('medsync_bookmarks', JSON.stringify(updated));
  };

  return (
    <div className="pb-20">
      {/* Hero Search Section */}
      <div className="bg-slate-900 py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-500 via-slate-900 to-slate-900"></div>
        <div className="max-w-4xl mx-auto relative z-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
            Search Medical Knowledge
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-2xl mx-auto">
            Access study notes and trusted guidelines. Continuously audited for clinical drift.
          </p>
          
          <form onSubmit={handleSearch} className="relative max-w-2xl mx-auto flex shadow-2xl">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 md:py-5 bg-white rounded-l-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 text-lg transition-shadow"
              placeholder="e.g. Scabies treatment, Antibiotic dosage..."
            />
            <button
              type="submit"
              disabled={isSearching}
              className="bg-teal-600 hover:bg-teal-500 text-white px-8 font-semibold rounded-r-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching ? <LoadingSpinner size="sm" /> : 'Search'}
            </button>
          </form>
          {searchQuery && searchResults && (
            <button 
              onClick={() => {setSearchQuery(''); setSearchResults(null);}}
              className="mt-4 text-sm text-slate-400 hover:text-white underline"
            >
              Clear search
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-12">
        {searchResults ? (
          /* SEARCH RESULTS VIEW */
          <div className="space-y-6 fade-in">
            <h2 className="text-2xl font-bold text-slate-800 border-b border-slate-200 pb-4">
              Search Results
            </h2>
            
            {searchResults.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No matches found for "{searchQuery}". Try different keywords.
              </div>
            ) : (
              <div className="space-y-4">
                {searchResults.map((res, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Link to={`/document/${res.document_id}`} className="text-sm font-bold text-teal-700 hover:text-teal-600 uppercase tracking-wider flex items-center gap-2 mb-2">
                          <BookOpen className="w-4 h-4" /> {res.doc_title}
                        </Link>
                        <p className="text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg border border-slate-100">
                          {res.chunk_text}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs font-medium text-slate-500">
                          <span className="bg-slate-100 px-2 py-1 rounded">
                            {res.category_name}
                          </span>
                          <span>Score: {(1 - res.distance).toFixed(2)}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleBookmark(res)}
                        className={`flex-shrink-0 p-2 rounded-full border transition-colors ${
                          isBookmarked(res.chunk_text)
                            ? 'bg-amber-100 border-amber-200 text-amber-600'
                            : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                        title={isBookmarked(res.chunk_text) ? 'Remove Bookmark' : 'Save Bookmark'}
                      >
                        <BookmarkIcon className="w-5 h-5" fill={isBookmarked(res.chunk_text) ? 'currentColor' : 'none'} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* DEFAULT VIEW (CATEGORIES & DOCS) */
          <>
            <div className="mb-12">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-teal-600" /> Browse Categories
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Link
                  to="/"
                  className={`p-4 rounded-xl border transition-all ${
                    !categoryId ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500 hover:shadow-sm'
                  }`}
                >
                  <h3 className="font-semibold text-lg">All Documents</h3>
                  {!categoryId && <p className="text-teal-100 text-sm mt-1 font-medium">{documents.length} docs</p>}
                </Link>
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/browse/${cat.id}`}
                    className={`p-4 rounded-xl border transition-all ${
                      categoryId === cat.id ? 'bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-600/20' : 'bg-white text-slate-700 border-slate-200 hover:border-teal-500 hover:shadow-sm'
                    }`}
                  >
                    <h3 className="font-semibold text-lg">{cat.name}</h3>
                    <p className={`text-sm mt-1 font-medium ${categoryId === cat.id ? 'text-teal-100' : 'text-slate-500'}`}>
                      {cat.document_count} docs
                    </p>
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-800 border-b border-slate-200 pb-2 flex-1">
                  {categoryId ? categories.find(c => c.id === categoryId)?.name : 'Latest Documents'}
                </h2>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white border border-slate-200 text-slate-700 text-xs rounded px-2 py-1 focus:outline-none ml-4"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
              
              {isLoading ? (
                <div className="py-12 flex justify-center"><LoadingSpinner /></div>
              ) : documents.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 text-slate-500">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                  No documents found in this category.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 fade-in">
                  {documents
                    .slice()
                    .sort((a, b) => {
                      if (sortBy === 'newest') {
                        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
                      } else if (sortBy === 'oldest') {
                        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
                      }
                      return 0;
                    })
                    .map(doc => (
                    <div key={doc.id} className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group flex flex-col h-full">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2.5 py-1 rounded-md">
                            {doc.categories?.name || 'Uncategorized'}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 mb-2 leading-tight group-hover:text-teal-600 transition-colors">
                          {doc.title}
                        </h3>
                        <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                          {doc.summary || 'No summary available.'}
                        </p>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Audited
                        </span>
                        <Link 
                          to={`/document/${doc.id}`}
                          className="text-sm font-semibold text-teal-600 group-hover:text-teal-700 flex items-center gap-1"
                        >
                          Read Document <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
