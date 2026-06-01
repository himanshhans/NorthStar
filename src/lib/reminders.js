import { create } from 'zustand'

const KEY = 'ns-reminders'

// check-in slots → trigger hour (local)
export const SLOTS = [
  { key: 'morning', hour: 8, label: 'Morning intention', path: '/checkin/morning' },
  { key: 'midday', hour: 13, label: 'Mid-day nudge', path: '/checkin/midday' },
  { key: 'evening', hour: 20, label: 'Evening reflection', path: '/checkin/evening' },
]

const defaults = { enabled: false, morning: true, midday: true, evening: true }

function load() {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return defaults
  }
}

export const useReminders = create((set, get) => ({
  prefs: load(),

  save: (patch) => {
    const prefs = { ...get().prefs, ...patch }
    localStorage.setItem(KEY, JSON.stringify(prefs))
    set({ prefs })
  },

  requestPermission: async () => {
    if (!('Notification' in window)) return 'unsupported'
    if (Notification.permission === 'granted') return 'granted'
    const res = await Notification.requestPermission()
    return res
  },
}))

export function notificationPermission() {
  return 'Notification' in window ? Notification.permission : 'unsupported'
}
