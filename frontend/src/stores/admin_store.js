import { create } from 'zustand'

const use_admin_store = create((set) => ({
  user: null,
  token: null,
  unread_count: 0,

  login: (token, user) => {
    localStorage.setItem('admin_token', token)
    set({ token, user })
  },

  logout: () => {
    localStorage.removeItem('admin_token')
    set({ token: null, user: null, unread_count: 0 })
  },

  set_unread_count: (count) => set({ unread_count: count }),

  hydrate_from_storage: () => {
    const stored_token = localStorage.getItem('admin_token')
    if (stored_token) {
      set({ token: stored_token })
    }
  }
}))

export default use_admin_store
