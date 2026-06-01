import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReminders, SLOTS } from '../lib/reminders'

const FIRED_KEY = 'ns-reminded'
const todayStr = () => new Date().toISOString().slice(0, 10)

function getFired() {
  try {
    const v = JSON.parse(localStorage.getItem(FIRED_KEY) || '{}')
    return v.date === todayStr() ? v : { date: todayStr() }
  } catch {
    return { date: todayStr() }
  }
}
function markFired(slot) {
  const v = getFired()
  v[slot] = true
  localStorage.setItem(FIRED_KEY, JSON.stringify(v))
}

// Fires browser notifications at check-in times while the app is open.
export default function ReminderManager() {
  const prefs = useReminders((s) => s.prefs)
  const navigate = useNavigate()

  useEffect(() => {
    if (!prefs.enabled || !('Notification' in window) || Notification.permission !== 'granted') return

    const check = () => {
      const hour = new Date().getHours()
      const fired = getFired()
      for (const slot of SLOTS) {
        if (!prefs[slot.key] || fired[slot.key]) continue
        // 2-hour window starting at the slot hour
        if (hour >= slot.hour && hour < slot.hour + 2) {
          const n = new Notification('NorthStar', {
            body: `Time for your ${slot.label.toLowerCase()}.`,
            icon: '/star.svg',
          })
          n.onclick = () => { window.focus(); navigate(slot.path); n.close() }
          markFired(slot.key)
        }
      }
    }

    check()
    const id = setInterval(check, 60 * 1000)
    return () => clearInterval(id)
  }, [prefs, navigate])

  return null
}
