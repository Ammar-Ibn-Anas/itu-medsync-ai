import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, FileText, Activity, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api';
import { LoadingSpinner } from '../../components/shared';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/api/notifications');
      setNotifications(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'DRIFT_DETECTED': return <Activity className="w-5 h-5 text-amber-500" />;
      case 'DOCUMENT_UPDATED': return <FileText className="w-5 h-5 text-blue-500" />;
      default: return <Bell className="w-5 h-5 text-teal-500" />;
    }
  };

  const formatTimeAgo = (dateStr) => {
    const diff = new Date() - new Date(dateStr);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-amber-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-slate-400 mt-1">Updates, alerts, and drift detection reports</p>
        </div>
        
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm font-medium text-teal-400 hover:text-teal-300 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-teal-500/10 transition-colors"
          >
            <Check className="w-4 h-4" /> Mark All Read
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center"><LoadingSpinner /></div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/30 border border-slate-700/50 rounded-xl border-dashed">
          <div className="mx-auto w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500">
            <Bell className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-slate-300 mb-1">All caught up!</h3>
          <p className="text-slate-500">You have no notifications at this time.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => (
            <div 
              key={notif.id} 
              className={`relative overflow-hidden p-4 md:p-5 border rounded-xl flex gap-4 transition-all ${
                notif.is_read 
                  ? 'bg-slate-800/50 border-slate-700/50 opacity-70' 
                  : 'bg-slate-800 border-slate-600 shadow-lg'
              }`}
            >
              {!notif.is_read && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500"></div>
              )}
              
              <div className={`mt-0.5 p-2 rounded-full h-fit flex-shrink-0 ${notif.is_read ? 'bg-slate-700/50' : 'bg-slate-700'}`}>
                {getIcon(notif.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className={`text-base font-semibold mb-1 ${notif.is_read ? 'text-slate-300' : 'text-white'}`}>
                  {notif.title}
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed mb-3">
                  {notif.message}
                </p>
                
                <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTimeAgo(notif.created_at)}
                  </span>
                  
                  {notif.documents?.title && (
                    <span className="truncate max-w-[200px] flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" />
                      {notif.documents.title}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex-shrink-0 flex flex-col gap-2">
                {!notif.is_read && (
                  <button
                    onClick={() => handleMarkRead(notif.id)}
                    className="p-1.5 text-slate-400 hover:text-teal-400 hover:bg-teal-500/10 rounded transition-colors"
                    title="Mark as read"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
