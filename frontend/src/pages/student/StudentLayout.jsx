import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Activity, ShieldCheck, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function StudentLayout() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center shadow-md shadow-teal-600/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 leading-none tracking-tight">MedSync AI</h1>
              <p className="text-[10px] font-semibold text-teal-600 uppercase tracking-widest mt-1">Student Portal</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-xs font-semibold tracking-wide">
              <ShieldCheck className="w-3.5 h-3.5" /> Clinical Guidelines Auto-Verified
            </div>
            
            {isAuthenticated ? (
              <button 
                onClick={() => navigate('/admin')}
                className="text-sm font-medium text-slate-600 hover:text-teal-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <Lock className="w-4 h-4" /> Dashboard
              </button>
            ) : (
              <button 
                onClick={() => navigate('/admin/login')}
                className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
              >
                Admin Login
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-6xl mx-auto">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800 mt-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-500" />
            <span className="text-white font-bold tracking-tight">MedSync AI</span>
          </div>
          <p className="text-sm text-slate-500 text-center md:text-left">
            Medical Knowledge Drift Detection Platform. For educational purposes.
          </p>
          <div className="text-xs text-slate-600">
            &copy; {new Date().getFullYear()} MedSync AI. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
