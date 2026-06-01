import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

const todayStr = () => new Date().toISOString().slice(0, 10)
const daysAgoStr = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function useHabits() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('habits')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })
}

/** All habit logs in the last `days` window — for streaks + heatmap. */
export function useHabitLogs(days = 120) {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['habit_logs', days],
    queryFn: async () => {
      const { data, error } = await sb
        .from('habit_logs')
        .select('habit_id, date, completed')
        .gte('date', daysAgoStr(days))
        .eq('completed', true)
      if (error) throw error
      return data
    },
  })
}

export function useCreateHabit() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (habit) => {
      const { data, error } = await sb.from('habits').insert(habit).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

export function useArchiveHabit() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id) => {
      const { error } = await sb.from('habits').update({ is_active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  })
}

/** Toggle today's completion for a habit (insert/flip the unique habit+date log). */
export function useToggleHabit() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ habitId, completed }) => {
      const { error } = await sb
        .from('habit_logs')
        .upsert(
          { habit_id: habitId, date: todayStr(), completed },
          { onConflict: 'habit_id,date' },
        )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habit_logs'] }),
  })
}

// --- helpers (pure) ---

/** Set of completed date strings for one habit, from the logs array. */
export function completedDates(logs, habitId) {
  return new Set(logs.filter((l) => l.habit_id === habitId).map((l) => l.date))
}

/** Current consecutive-day streak ending today (or yesterday) for a habit. */
export function streakFor(logs, habitId) {
  const done = completedDates(logs, habitId)
  let streak = 0
  const d = new Date()
  // allow streak to count if today not yet done but yesterday was
  if (!done.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1)
  while (done.has(d.toISOString().slice(0, 10))) {
    streak++
    d.setDate(d.getDate() - 1)
  }
  return streak
}
