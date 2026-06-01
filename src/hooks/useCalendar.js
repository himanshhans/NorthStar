import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

export function useCalendar() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['calendar'],
    queryFn: async () => {
      const [msRes, ciRes, logsRes] = await Promise.all([
        sb.from('milestones').select('id, title, due_date, status, goals(title)').not('due_date', 'is', null),
        sb.from('checkins').select('type, date'),
        sb.from('habit_logs').select('date').eq('completed', true),
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
