import { Navigate, Outlet } from 'react-router-dom'
import use_admin_store from '../stores/admin_store'

export default function ProtectedRoute() {
  const token = use_admin_store((s) => s.token)
  if (!token) return <Navigate to="/admin/login" replace />
  return <Outlet />
}
