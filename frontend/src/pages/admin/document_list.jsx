import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api_client'

export default function DocumentList() {
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/documents')
      return res.data
    }
  })

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold font-sora">Documents</h1>
        <Link to="/admin/documents/upload" className="bg-primary text-white px-4 py-2 rounded">
          Upload New
        </Link>
      </div>

      <div className="bg-white dark:bg-surface border border-border rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-surface/50 border-b border-border">
            <tr>
              <th className="p-4 font-medium text-sm">Title</th>
              <th className="p-4 font-medium text-sm">Category</th>
              <th className="p-4 font-medium text-sm">Status</th>
              <th className="p-4 font-medium text-sm">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">Loading...</td></tr>
            ) : documents?.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-gray-500">No documents found.</td></tr>
            ) : (
              documents?.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-surface/80">
                  <td className="p-4 font-medium">
                    <Link to={`/admin/documents/${doc.id}`} className="hover:underline">
                      {doc.title}
                    </Link>
                  </td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-400">
                    {doc.category?.name || 'Uncategorized'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      doc.is_published ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {doc.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4">
                    <Link to={`/admin/documents/${doc.id}`} className="text-primary hover:underline text-sm">
                      Manage
                    </Link>
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
