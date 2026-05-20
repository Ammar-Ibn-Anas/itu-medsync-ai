import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api_client'
import { FileText, Play, Activity } from 'lucide-react'

export default function DocumentDetail() {
  const { id } = useParams()
  const [active_tab, set_active_tab] = useState('content')

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: async () => {
      const res = await api.get(`/api/v1/admin/documents/${id}`)
      return res.data
    }
  })

  if (isLoading) return <div className="p-8">Loading...</div>
  if (!doc) return <div className="p-8">Document not found</div>

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold font-sora mb-2">{doc.title}</h1>
          <p className="text-gray-500">{doc.category?.name || 'Uncategorized'} • {doc.doc_type}</p>
        </div>
        <button className="bg-primary text-white px-4 py-2 rounded flex items-center gap-2 font-medium">
          <Play className="w-4 h-4" /> Run Audit
        </button>
      </div>

      <div className="flex gap-4 border-b border-border mb-6">
        <TabButton active={active_tab === 'content'} onClick={() => set_active_tab('content')}>
          <FileText className="w-4 h-4" /> Content
        </TabButton>
        <TabButton active={active_tab === 'history'} onClick={() => set_active_tab('history')}>
          <Activity className="w-4 h-4" /> Audit History
        </TabButton>
        <TabButton active={active_tab === 'settings'} onClick={() => set_active_tab('settings')}>
          Settings
        </TabButton>
      </div>

      <div className="bg-white dark:bg-surface rounded-lg border border-border p-6 shadow-sm">
        {active_tab === 'content' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Extracted Chunks</h2>
            <div className="space-y-4">
              {doc.chunks?.map((chunk, i) => (
                <div key={i} className="p-4 bg-gray-50 dark:bg-surface/50 rounded text-sm">
                  {chunk.content}
                </div>
              ))}
              {!doc.chunks?.length && <p className="text-gray-500">No chunks available.</p>}
            </div>
          </div>
        )}

        {active_tab === 'history' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Past Audits</h2>
            <p className="text-gray-500">No audits run yet.</p>
          </div>
        )}

        {active_tab === 'settings' && (
          <div>
            <h2 className="text-lg font-bold mb-4 text-danger">Danger Zone</h2>
            <button className="border border-danger text-danger px-4 py-2 rounded hover:bg-danger/10 transition">
              Delete Document
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TabButton({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 flex items-center gap-2 font-medium border-b-2 transition-colors ${
        active ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-foreground hover:border-gray-300'
      }`}
    >
      {children}
    </button>
  )
}
