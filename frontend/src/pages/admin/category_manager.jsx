import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '../../services/api_client'

export default function CategoryManager() {
  const [new_category, set_new_category] = useState('')
  
  const { data: categories, isLoading, refetch } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/v1/categories')
      return res.data
    }
  })

  const handle_add = async (e) => {
    e.preventDefault()
    if (!new_category.trim()) return
    try {
      await api.post('/api/v1/categories', { name: new_category })
      set_new_category('')
      refetch()
    } catch (err) {
      alert('Failed to add category')
    }
  }

  const handle_delete = async (id) => {
    if (!confirm('Are you sure?')) return
    try {
      await api.delete(`/api/v1/categories/${id}`)
      refetch()
    } catch (err) {
      alert('Failed to delete category')
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold font-sora mb-6">Manage Categories</h1>

      <form onSubmit={handle_add} className="flex gap-4 mb-8">
        <input 
          type="text" 
          value={new_category} 
          onChange={e => set_new_category(e.target.value)} 
          placeholder="New Category Name" 
          className="flex-1 p-2 border border-border rounded bg-white dark:bg-surface outline-none focus:ring-2 focus:ring-primary"
        />
        <button type="submit" className="bg-primary text-white px-6 rounded font-medium">Add</button>
      </form>

      <div className="bg-white dark:bg-surface border border-border rounded-lg shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-surface/50 border-b border-border">
            <tr>
              <th className="p-4">Name</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr><td colSpan="2" className="p-4 text-center">Loading...</td></tr>
            ) : categories?.length === 0 ? (
              <tr><td colSpan="2" className="p-4 text-center">No categories found.</td></tr>
            ) : (
              categories?.map(c => (
                <tr key={c.id}>
                  <td className="p-4">{c.name}</td>
                  <td className="p-4 text-right">
                    <button onClick={() => handle_delete(c.id)} className="text-danger hover:underline">Delete</button>
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
