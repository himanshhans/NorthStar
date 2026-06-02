import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

// Bound the daily-growing tables to a window so the query stays fast as data piles up.
const windowStart = () => {
  const d = new Date()
  d.setDate(d.getDate() - 400)
  return d.toISOString().slice(0, 10)
}

export function useCalendar() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['calendar'],
    queryFn: async () => {
      const since = windowStart()
      const [msRes, ciRes, logsRes] = await Promise.all([
        // milestones are few (bounded by goal count) — keep all, future dates included
        sb.from('milestones').select('id, title, due_date, status, goals(title)').not('due_date', 'is', null),
        sb.from('checkins').select('type, date').gte('date', since),
        sb.from('habit_logs').select('date').eq('completed', true).gte('date', since),
      ])
      for (const r of [msRes, ciRes, logsRes]) if (r.error) throw r.error

      const milestones = {}
      for (const m of msRes.data) {
        ;(milestones[m.due_date] ??= []).push({
          title: m.title,
          status: m.status,
          goal: m.goals?.title,
        })
      }
      const checkins = {}
      for (const c of ciRes.data) {
        ;(checkins[c.date] ??= new Set()).add(c.type)
      }
      const habits = {}
      for (const l of logsRes.data) {
        habits[l.date] = (habits[l.date] || 0) + 1
      }
      return { milestones, checkins, habits }
    },
  })
}
