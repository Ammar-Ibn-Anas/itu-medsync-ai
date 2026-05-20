import { create } from 'zustand'

const STORAGE_KEY = 'medsync_bookmarks'

const use_student_store = create((set, get) => ({
  bookmarks: [],

  load_bookmarks: () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const bookmark_list = stored ? JSON.parse(stored) : []
      set({ bookmarks: bookmark_list })
    } catch {
      set({ bookmarks: [] })
    }
  },

  add_bookmark: (doc) => {
    const current = get().bookmarks
    const already_exists = current.some((b) => b.id === doc.id)
    if (already_exists) return
    const updated = [...current, { ...doc, saved_at: new Date().toISOString() }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    set({ bookmarks: updated })
  },

  remove_bookmark: (doc_id) => {
    const updated = get().bookmarks.filter((b) => b.id !== doc_id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    set({ bookmarks: updated })
  },

  is_bookmarked: (doc_id) => {
    return get().bookmarks.some((b) => b.id === doc_id)
  }
}))

export default use_student_store
