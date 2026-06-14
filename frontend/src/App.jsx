import { useState } from 'react'
import AdminDashboard from './AdminDashboard'
import StudentPortal from './StudentPortal'

export default function App() {
  const [tab, setTab] = useState('admin')

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">🏥 MedSync AI</h1>
            <p className="text-blue-200 text-sm">Medical Knowledge Drift Detection</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTab('admin')}
              className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                tab === 'admin'
                  ? 'bg-white text-blue-800'
                  : 'text-blue-200 hover:bg-blue-700'
              }`}
            >
              Admin Dashboard
            </button>
            <button
              onClick={() => setTab('student')}
              className={`px-4 py-2 rounded font-medium text-sm transition-colors ${
                tab === 'student'
                  ? 'bg-white text-blue-800'
                  : 'text-blue-200 hover:bg-blue-700'
              }`}
            >
              Student Portal
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        {tab === 'admin' ? <AdminDashboard /> : <StudentPortal />}
      </main>
    </div>
  )
}
