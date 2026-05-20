import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import use_admin_store from './stores/admin_store'
import use_student_store from './stores/student_store'

// student pages
import StudentHome from './pages/student/student_home'
import DocumentReader from './pages/student/document_reader'

// admin pages
import AdminLogin from './pages/admin/admin_login'
import AdminDashboard from './pages/admin/admin_dashboard'
import DocumentList from './pages/admin/document_list'
import DocumentUpload from './pages/admin/document_upload'
import DocumentDetail from './pages/admin/document_detail'
import AuditReport from './pages/admin/audit_report'
import CategoryManager from './pages/admin/category_manager'
import TrustedSources from './pages/admin/trusted_sources'
import Notifications from './pages/admin/notifications'

// shared
import ProtectedRoute from './components/protected_route'

const query_client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    }
  }
})

export default function App() {
  const hydrate_from_storage = use_admin_store((s) => s.hydrate_from_storage)
  const load_bookmarks        = use_student_store((s) => s.load_bookmarks)

  useEffect(() => {
    hydrate_from_storage()
    load_bookmarks()
  }, [])

  return (
    <QueryClientProvider client={query_client}>
      <BrowserRouter basename="/medsync-ai">
        <Routes>
          {/* student portal — public */}
          <Route path="/"             element={<StudentHome />} />
          <Route path="/document/:id" element={<DocumentReader />} />

          {/* admin auth */}
          <Route path="/admin/login"  element={<AdminLogin />} />

          {/* admin — protected */}
          <Route path="/admin" element={<ProtectedRoute />}>
            <Route index                       element={<AdminDashboard />} />
            <Route path="documents"            element={<DocumentList />} />
            <Route path="documents/upload"     element={<DocumentUpload />} />
            <Route path="documents/:id"        element={<DocumentDetail />} />
            <Route path="audit/:id"            element={<AuditReport />} />
            <Route path="categories"           element={<CategoryManager />} />
            <Route path="trusted_sources"      element={<TrustedSources />} />
            <Route path="notifications"        element={<Notifications />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
