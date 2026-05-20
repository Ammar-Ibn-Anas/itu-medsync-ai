import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bell, Check } from 'lucide-react'
import api from '../../services/api_client'

export default function Notifications() {
  const queryClient = useQueryClient()

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get('/api/v1/admin/notifications')
      return res.data
    }
  })

  const markRead = useMutation({
    mutationFn: async (id) => {
      await api.post(`/api/v1/admin/notifications/${id}/read`)
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
  })

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold font-sora flex items-center gap-2">
          <Bell className="w-6 h-6" /> Notifications
        </h1>
        <button className="text-primary text-sm font-medium hover:underline">Mark all as read</button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <p>Loading...</p>
        ) : notifications?.length === 0 ? (
          <div className="p-8 text-center border border-border rounded bg-white dark:bg-surface text-gray-500">
            You're all caught up!
          </div>
        ) : (
          notifications?.map(n => (
            <div key={n.id} className={`p-4 border border-border rounded-lg flex gap-4 ${n.is_read ? 'bg-white dark:bg-surface opacity-75' : 'bg-primary/5 border-primary/20'}`}>
              <div className="mt-1 text-primary"><Bell className="w-5 h-5" /></div>
              <div className="flex-1">
                <h3 className="font-bold text-foreground">{n.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{n.body}</p>
                <p className="text-xs text-gray-400 mt-2">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              {!n.is_read && (
                <button 
                  onClick={() => markRead.mutate(n.id)}
                  className="w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-success transition"
                  title="Mark as read"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
