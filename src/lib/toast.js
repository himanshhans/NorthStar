import { create } from 'zustand'

let counter = 0

export const useToasts = create((set) => ({
  toasts: [],
  push: (message, type = 'error', ttl = 5000) => {
    const id = ++counter
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }))
    if (ttl) setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ttl)
    return id
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

// fire a toast from anywhere (non-React code)
export const toast = (message, type = 'error') => useToasts.getState().push(message, type)
