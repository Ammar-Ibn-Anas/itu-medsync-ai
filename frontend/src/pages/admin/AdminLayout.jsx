import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  FileText, Shield, Bell, LogOut, Menu, X, 
  Activity, Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api';

export default function AdminLayout() {
  const { admin, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch unread notifications count
    const fetchUnread = async () => {
      try {
        const res = await api.get('/api/notifications/unread-count');
        setUnreadCount(res.data.count);
      } catch (err) {
        console.error('Failed to fetch unread count', err);
      }
    };
    
    fetchUnread();
    // In a real app, this would be a websocket or polling
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { name: 'Documents', path: '/admin', icon: FileText, exact: true },
    { name: 'Drift Audit', path: '/admin/audit', icon: Shield },
    { 
      name: 'Notifications', 
      path: '/admin/notifications', 
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : null
    },
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-bold text-lg">MedSync Admin</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="text-slate-300 hover:text-white"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <div className={`
        ${isMobileMenuOpen ? 'block' : 'hidden'} 
        md:block w-full md:w-64 bg-slate-800 border-r border-slate-700 flex-shrink-0 
        flex flex-col h-auto md:h-screen sticky top-0
      `}>
        <div className="hidden md:flex items-center gap-3 p-6 border-b border-slate-700">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-teal-900/50">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">MedSync AI</h2>
            <p className="text-teal-500 text-xs font-medium">Admin Portal</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 px-3">
            Menu
          </div>
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.exact}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) => `
                flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200
                ${isActive 
                  ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                  : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'}
              `}
            >
              <div className="flex items-center gap-3 font-medium">
                <item.icon className="w-5 h-5" />
                {item.name}
              </div>
              {item.badge && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
          
          <div className="mt-8 pt-8 border-t border-slate-700">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-400 hover:bg-slate-700/50 hover:text-slate-200 transition-all font-medium"
            >
              <Search className="w-5 h-5" />
              View Student Portal
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
                {admin?.name?.charAt(0) || 'A'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-white truncate">{admin?.name}</p>
                <p className="text-xs text-slate-500 truncate">{admin?.email}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 bg-slate-900 min-h-[calc(100vh-64px)] md:min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
