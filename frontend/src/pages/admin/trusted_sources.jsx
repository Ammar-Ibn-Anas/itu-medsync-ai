import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api_client'
import { Link2 } from 'lucide-react'

export default function TrustedSources() {
  const [url, set_url] = useState('')
  
  const { data: sources, isLoading, refetch } = useQuery({
    queryKey: ['trusted_sources'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/trusted_sources')
      return res.data
    }
  })

  const handle_add = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    try {
      await api.post('/api/v1/admin/trusted_sources', { url })
      set_url('')
      refetch()
    } catch (err) {
      alert('Failed to add source')
    }
  }

  const handle_delete = async (id) => {
    try {
      await api.delete(`/api/v1/admin/trusted_sources/${id}`)
      refetch()
    } catch (err) {
      alert('Failed to delete source')
    }
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold font-sora mb-2">Trusted Web Sources</h1>
      <p className="text-gray-500 mb-6">URLs listed here are given high priority during AI web grounding audits.</p>

      <form onSubmit={handle_add} className="flex gap-4 mb-8">
        <div className="flex-1 relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="url" 
            value={url} 
            onChange={e => set_url(e.target.value)} 
            placeholder="https://example-guidelines.org/..." 
            className="w-full p-3 pl-10 border border-border rounded bg-white dark:bg-surface outline-none focus:ring-2 focus:ring-primary"
            required
          />
        </div>
        <button type="submit" className="bg-primary text-white px-6 rounded font-medium">Whitelist URL</button>
      </form>

      <div className="bg-white dark:bg-surface border border-border rounded-lg shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-surface/50 border-b border-border">
            <tr>
              <th className="p-4">URL</th>
              <th className="p-4">Added By</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan="3" className="p-4 text-center">Loading...</td></tr>
            ) : sources?.length === 0 ? (
              <tr><td colSpan="3" className="p-4 text-center">No trusted sources added yet.</td></tr>
            ) : (
              sources?.map(s => (
                <tr key={s.id}>
                  <td className="p-4 font-medium text-primary hover:underline max-w-md truncate">
                    <a href={s.url} target="_blank" rel="noreferrer">{s.url}</a>
                  </td>
                  <td className="p-4 text-gray-500 text-sm">Admin</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handle_delete(s.id)} className="text-danger hover:underline text-sm font-medium">Remove</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
