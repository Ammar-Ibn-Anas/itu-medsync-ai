import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import DocumentsPage from './pages/admin/DocumentsPage';
import AuditPage from './pages/admin/AuditPage';
import NotificationsPage from './pages/admin/NotificationsPage';

import StudentLayout from './pages/student/StudentLayout';
import HomePage from './pages/student/HomePage';
import DocumentView from './pages/student/DocumentView';
import BookmarksPage from './pages/student/BookmarksPage';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

export default function App() {
  return (
    <Routes>
      {/* Public Student Portal */}
      <Route element={<StudentLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/browse/:categoryId" element={<HomePage />} />
        <Route path="/document/:id" element={<DocumentView />} />
        <Route path="/bookmarks" element={<BookmarksPage />} />
      </Route>

      {/* Admin Auth */}
      <Route path="/admin/login" element={<LoginPage />} />

      {/* Protected Admin Portal */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<DocumentsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
      </Route>
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
