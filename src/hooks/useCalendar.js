import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

// Bound the daily-growing tables to a window so the query stays fast as data piles up.
const windowStart = () => {
  const d = new Date()
  d.setDate(d.getDate() - 400)
  return d.toISOString().slice(0, 10)
}
const todayStr = () => new Date().toISOString().slice(0, 10)

// all dates from start..end inclusive (capped), as 'YYYY-MM-DD'
function dateRange(start, end) {
  const out = []
  const d = new Date(start + 'T00:00:00Z')
  const last = new Date((end || start) + 'T00:00:00Z')
  let guard = 0
  while (d <= last && guard++ < 90) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

export function useCalendar() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['calendar'],
    queryFn: async () => {
      const since = windowStart()
      const [msRes, ciRes, logsRes, evRes] = await Promise.all([
        // milestones are few (bounded by goal count) — keep all, future dates included
        sb.from('milestones').select('id, title, due_date, status, goals(title)').not('due_date', 'is', null),
        sb.from('checkins').select('type, date').gte('date', since),
        sb.from('habit_logs').select('date').eq('completed', true).gte('date', since),
        sb.from('events').select('id, date, end_date, time, title, note').order('time', { nullsFirst: true }),
      ])
      for (const r of [msRes, ciRes, logsRes, evRes]) if (r.error) throw r.error

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
      // expand multi-day events onto each day in their span
      const events = {}
      for (const e of evRes.data) {
        for (const day of dateRange(e.date, e.end_date)) {
          ;(events[day] ??= []).push(e)
        }
      }
      return { milestones, checkins, habits, events }
    },
  })
}

/** Events overlapping today (incl. multi-day spans), for dashboard + reminders. */
export function useTodayEvents() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['today_events'],
    queryFn: async () => {
      const today = todayStr()
      const { data, error } = await sb
        .from('events')
        .select('id, date, end_date, time, title')
        .lte('date', today)
        .gte('date', windowStart())
        .order('time', { nullsFirst: true })
      if (error) throw error
      return data.filter((e) => (e.end_date || e.date) >= today)
    },
  })
}

const invalidateEvents = (qc) => {
  qc.invalidateQueries({ queryKey: ['calendar'] })
  qc.invalidateQueries({ queryKey: ['today_events'] })
}

export function useAddEvent() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ date, end_date, time, title, note }) => {
      const { data, error } = await sb
        .from('events')
        .insert({ date, end_date: end_date || null, time: time || null, title, note: note || null })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => invalidateEvents(qc),
  })
}

export function useUpdateEvent() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, date, end_date, time, title }) => {
      const { error } = await sb
        .from('events')
        .update({ date, end_date: end_date || null, time: time || null, title })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateEvents(qc),
  })
}

export function useDeleteEvent() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await sb.from('events').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidateEvents(qc),
  })
}
