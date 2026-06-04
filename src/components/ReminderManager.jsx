import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReminders, SLOTS } from '../lib/reminders'
import { useTodayEvents } from '../hooks/useCalendar'
import { todayStr } from '../lib/date'

const FIRED_KEY = 'ns-reminded'
const EVENT_FIRED_KEY = 'ns-event-fired'

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

// event reminders: fire once when the clock reaches an event's time
function getEventFired() {
  try {
    const v = JSON.parse(localStorage.getItem(EVENT_FIRED_KEY) || '{}')
    return v.date === todayStr() ? v : { date: todayStr(), ids: [] }
  } catch {
    return { date: todayStr(), ids: [] }
  }
}
function markEventFired(id) {
  const v = getEventFired()
  if (!v.ids.includes(id)) v.ids.push(id)
  localStorage.setItem(EVENT_FIRED_KEY, JSON.stringify(v))
}

// Fires browser notifications at check-in times + event times while the app is open.
export default function ReminderManager() {
  const prefs = useReminders((s) => s.prefs)
  const navigate = useNavigate()
  const { data: events = [] } = useTodayEvents()

  // event-time reminders
  useEffect(() => {
    if (!prefs.enabled || !('Notification' in window) || Notification.permission !== 'granted') return
    const timed = events.filter((e) => e.time)
    if (!timed.length) return

    const check = () => {
      const now = new Date()
      const mins = now.getHours() * 60 + now.getMinutes()
      const fired = getEventFired()
      for (const e of timed) {
        const [h, m] = e.time.split(':').map(Number)
        const evMins = h * 60 + m
        if (!fired.ids.includes(e.id) && mins >= evMins && mins < evMins + 2) {
          const n = new Notification('NorthStar — Event', {
            body: `${e.time.slice(0, 5)} · ${e.title}`,
            icon: '/star.svg',
          })
          n.onclick = () => { window.focus(); navigate('/calendar'); n.close() }
          markEventFired(e.id)
        }
      }
    }
    check()
    const id = setInterval(check, 60 * 1000)
    return () => clearInterval(id)
  }, [prefs, events, navigate])

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
