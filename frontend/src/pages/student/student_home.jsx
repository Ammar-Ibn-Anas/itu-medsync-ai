import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search } from 'lucide-react'

export default function StudentHome() {
  const [query, set_query] = useState('')

  const handle_search = (e) => {
    e.preventDefault()
    // implement search
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-primary/5 border-b border-primary/10 py-20 px-4 text-center">
        <h1 className="text-4xl md:text-5xl font-bold font-sora text-foreground mb-4">MedSync AI</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-xl mx-auto">
          Search the latest medical guidelines and trusted study materials.
        </p>
        
        <form onSubmit={handle_search} className="max-w-2xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={query}
            onChange={(e) => set_query(e.target.value)}
            placeholder="Search symptoms, treatments, guidelines..."
            className="w-full py-4 pl-12 pr-4 rounded-full border border-border bg-white shadow-lg focus:ring-2 focus:ring-primary outline-none text-lg"
          />
        </form>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold font-sora mb-6">Recently Updated</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-border rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition">
            <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded">Cardiology</span>
            <h3 className="font-bold text-lg mt-3 mb-2">Heart Failure Guidelines 2026</h3>
            <p className="text-gray-500 text-sm mb-4">Updated 2 days ago</p>
            <Link to="/document/1" className="text-primary text-sm font-medium hover:underline">Read Document →</Link>
          </div>
        </div>
      </div>

      <footer className="text-center py-8 text-sm text-gray-400">
        <Link to="/admin/login" className="hover:text-gray-600 transition">Admin Portal</Link>
      </footer>
    </div>
  )
}
