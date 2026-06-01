import { create } from 'zustand'

const KEY = 'ns-theme' // 'system' | 'light' | 'dark'

const prefersDark = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches

function resolve(pref) {
  return pref === 'system' ? (prefersDark() ? 'dark' : 'light') : pref
}

function apply(pref) {
  const r = resolve(pref)
  const el = document.documentElement
  el.classList.remove('light', 'dark')
  el.classList.add(r)
  return r
}

const initialPref =
  (typeof localStorage !== 'undefined' && localStorage.getItem(KEY)) || 'system'

export const useTheme = create((set, get) => ({
  pref: initialPref,
  resolved: resolve(initialPref),

  setPref: (pref) => {
    localStorage.setItem(KEY, pref)
    const resolved = apply(pref)
    set({ pref, resolved })
  },

  // system → light → dark → system
  cycle: () => {
    const order = ['system', 'light', 'dark']
    const next = order[(order.indexOf(get().pref) + 1) % order.length]
    get().setPref(next)
  },
}))

// Keep in sync with OS changes while on 'system'.
if (typeof matchMedia !== 'undefined') {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { pref, setPref } = useTheme.getState()
    if (pref === 'system') setPref('system')
  })
}
