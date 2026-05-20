import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import use_admin_store from '../../stores/admin_store'
import api from '../../services/api_client'

export default function AdminLogin() {
  const [email, set_email] = useState('')
  const [password, set_password] = useState('')
  const [error, set_error] = useState('')
  const [is_loading, set_is_loading] = useState(false)
  const login = use_admin_store((s) => s.login)
  const navigate = useNavigate()

  const handle_submit = async (e) => {
    e.preventDefault()
    set_is_loading(true)
    set_error('')
    
    try {
      const form_data = new URLSearchParams()
      form_data.append('username', email)
      form_data.append('password', password)
      
      const res = await api.post('/api/v1/auth/login', form_data, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
      
      login(res.data.access_token, { email })
      navigate('/admin')
    } catch (err) {
      set_error(err.response?.data?.detail || 'Login failed')
    } finally {
      set_is_loading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background dark:bg-surface p-4">
      <div className="w-full max-w-md bg-white dark:bg-surface rounded-xl shadow-lg border border-border p-8">
        <h1 className="text-2xl font-bold text-center mb-6 text-foreground">Admin Login</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-danger/10 border border-danger text-danger rounded">
            {error}
          </div>
        )}

        <form onSubmit={handle_submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => set_email(e.target.value)}
              className="w-full p-2 border border-border rounded bg-transparent text-foreground focus:ring-2 focus:ring-primary outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => set_password(e.target.value)}
              className="w-full p-2 border border-border rounded bg-transparent text-foreground focus:ring-2 focus:ring-primary outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={is_loading}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-2 rounded font-medium transition-colors"
          >
            {is_loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
