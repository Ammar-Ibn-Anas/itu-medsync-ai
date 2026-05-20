import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useDropzone } from 'react-dropzone'
import api from '../../services/api_client'

export default function DocumentUpload() {
  const [title, set_title] = useState('')
  const [description, set_description] = useState('')
  const [category_id, set_category_id] = useState('')
  const [file, set_file] = useState(null)
  const [is_uploading, set_is_uploading] = useState(false)
  const navigate = useNavigate()

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/api/v1/categories')
      return res.data
    }
  })

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'application/pdf': ['.pdf'] },
    maxFiles: 1,
    onDrop: accepted => set_file(accepted[0])
  })

  const handle_submit = async (e) => {
    e.preventDefault()
    if (!file) return alert('Please select a file')
    
    set_is_uploading(true)
    try {
      const form_data = new FormData()
      form_data.append('file', file)
      form_data.append('title', title || file.name)
      form_data.append('description', description)
      if (category_id) form_data.append('category_id', category_id)

      const res = await api.post('/api/v1/admin/documents/upload', form_data)
      navigate(`/admin/documents/${res.data.id}`)
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      set_is_uploading(false)
    }
  }

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold font-sora mb-6">Upload Document</h1>
      
      <form onSubmit={handle_submit} className="space-y-6 bg-white dark:bg-surface p-6 rounded-lg border border-border">
        
        <div {...getRootProps()} className={`border-2 border-dashed p-12 text-center rounded-lg cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-gray-400'}`}>
          <input {...getInputProps()} />
          {file ? (
            <p className="font-medium text-primary">{file.name}</p>
          ) : (
            <p className="text-gray-500">Drag & drop a PDF here, or click to select</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Title (optional)</label>
          <input type="text" value={title} onChange={e => set_title(e.target.value)} className="w-full p-2 border border-border rounded bg-transparent" placeholder="Leave blank to use filename" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select value={category_id} onChange={e => set_category_id(e.target.value)} className="w-full p-2 border border-border rounded bg-transparent">
            <option value="">-- Select Category --</option>
            {categories?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button type="submit" disabled={is_uploading || !file} className="w-full bg-primary text-white py-3 rounded font-medium disabled:opacity-50">
          {is_uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>
    </div>
  )
}
