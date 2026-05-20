import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

// attach jwt on every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── auth ───────────────────────────────────────────────────
export const login = (email, password) =>
  api.post('/api/v1/auth/login', { email, password })

export const logout = () =>
  api.post('/api/v1/auth/logout')

export const get_me = () =>
  api.get('/api/v1/auth/me')

// ─── categories ─────────────────────────────────────────────
export const fetch_categories = () =>
  api.get('/api/v1/categories')

export const create_category = (data) =>
  api.post('/api/v1/categories', data)

export const update_category = (id, data) =>
  api.put(`/api/v1/categories/${id}`, data)

export const delete_category = (id) =>
  api.delete(`/api/v1/categories/${id}`)

// ─── admin documents ────────────────────────────────────────
export const fetch_admin_documents = (params) =>
  api.get('/api/v1/admin/documents', { params })

export const upload_document = (form_data) =>
  api.post('/api/v1/admin/documents/upload', form_data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })

export const create_text_document = (data) =>
  api.post('/api/v1/admin/documents/text', data)

export const fetch_document = (id) =>
  api.get(`/api/v1/admin/documents/${id}`)

export const update_document = (id, data) =>
  api.put(`/api/v1/admin/documents/${id}`, data)

export const delete_document = (id) =>
  api.delete(`/api/v1/admin/documents/${id}`)

export const reindex_document = (id) =>
  api.post(`/api/v1/admin/documents/${id}/reindex`)

export const toggle_publish = (id, is_published) =>
  api.patch(`/api/v1/admin/documents/${id}/publish`, { is_published })

// ─── trusted sources ────────────────────────────────────────
export const fetch_trusted_sources = () =>
  api.get('/api/v1/admin/trusted_sources')

export const create_trusted_source = (data) =>
  api.post('/api/v1/admin/trusted_sources', data)

export const delete_trusted_source = (id) =>
  api.delete(`/api/v1/admin/trusted_sources/${id}`)

export const fetch_trusted_source = (id) =>
  api.post(`/api/v1/admin/trusted_sources/${id}/fetch`)

// ─── audit ──────────────────────────────────────────────────
export const run_audit = (data) =>
  api.post('/api/v1/admin/audit/run', data)

export const fetch_audit = (audit_id) =>
  api.get(`/api/v1/admin/audit/${audit_id}`)

export const fetch_document_audits = (document_id) =>
  api.get(`/api/v1/admin/audit/document/${document_id}`)

export const fetch_all_audits = (params) =>
  api.get('/api/v1/admin/audit', { params })

// ─── notifications ──────────────────────────────────────────
export const fetch_notifications = (unread_only = false) =>
  api.get('/api/v1/admin/notifications', { params: { unread_only } })

export const mark_notification_read = (id) =>
  api.patch(`/api/v1/admin/notifications/${id}/read`)

export const mark_all_notifications_read = () =>
  api.post('/api/v1/admin/notifications/read_all')

export const delete_notification = (id) =>
  api.delete(`/api/v1/admin/notifications/${id}`)

// ─── student ────────────────────────────────────────────────
export const search_documents = (q, params = {}) =>
  api.get('/api/v1/student/search', { params: { q, ...params } })

export const fetch_published_documents = (params) =>
  api.get('/api/v1/student/documents', { params })

export const fetch_published_document = (id) =>
  api.get(`/api/v1/student/documents/${id}`)

export const fetch_student_categories = () =>
  api.get('/api/v1/student/categories')

export default api
