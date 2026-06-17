import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, FileText, Trash2, ArrowLeft } from 'lucide-react';

export default function BookmarksPage() {
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('medsync_bookmarks') || '[]');
    setBookmarks(saved);
  }, []);

  const removeBookmark = (id) => {
    const updated = bookmarks.filter(b => b.id !== id);
    setBookmarks(updated);
    localStorage.setItem('medsync_bookmarks', JSON.stringify(updated));
    window.dispatchEvent(new Event('bookmarks_updated'));
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 fade-in">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/" className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <div className="p-2 bg-teal-100 text-teal-700 rounded-xl">
            <Bookmark className="w-6 h-6" />
          </div>
          My Bookmarks
        </h1>
      </div>

      {bookmarks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Bookmark className="w-10 h-10 text-slate-300" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-3">No bookmarks yet</h3>
          <p className="text-slate-500 max-w-md mx-auto text-lg">
            Save important study notes and guidelines to your bookmarks for quick access later.
          </p>
          <Link to="/" className="inline-flex items-center justify-center mt-8 px-8 py-3 bg-slate-900 hover:bg-teal-600 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-teal-600/30">
            Browse Documents
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {bookmarks.map(b => (
            <div key={b.id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all flex flex-col group">
              <div className="flex items-start justify-between mb-4 gap-4">
                <h3 className="font-bold text-slate-900 text-lg line-clamp-2 leading-tight flex-1 group-hover:text-teal-700 transition-colors">
                  {b.title}
                </h3>
                <button
                  onClick={() => removeBookmark(b.id)}
                  className="text-slate-400 hover:text-rose-500 p-2 bg-slate-50 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                  title="Remove Bookmark"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <p className="text-slate-500 line-clamp-3 mb-6 flex-1 text-sm leading-relaxed">
                {b.summary || <span className="italic text-slate-400">No summary available.</span>}
              </p>
              
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2 py-1 rounded">
                  <FileText className="w-3.5 h-3.5" /> {b.category || 'Uncategorized'}
                </span>
                <Link
                  to={`/document/${b.id}`}
                  className="text-sm font-bold text-teal-600 hover:text-teal-700 transition-colors flex items-center gap-1"
                >
                  Read &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
