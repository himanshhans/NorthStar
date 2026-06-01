import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'
import { useLifeScore } from './useLifeScore'

const iso = (d) => d.toISOString().slice(0, 10)
const daysAgoStr = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return iso(d)
}
/** Sunday that starts the current week. */
export function weekStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return iso(d)
}

export function useWeeklyReviews() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['weekly_reviews'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('weekly_reviews')
        .select('*')
        .order('week_start', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useGenerateWeeklyReview() {
  const sb = useSupabase()
  const qc = useQueryClient()
  const { data: life } = useLifeScore()

  return useMutation({
    mutationFn: async () => {
      const since7 = daysAgoStr(6)

      const [goalsRes, msRes, habitsRes, logsRes, ciRes] = await Promise.all([
        sb.from('goals').select('id, title, category, status').neq('status', 'Abandoned'),
        sb.from('milestones').select('goal_id, status'),
        sb.from('habits').select('id, title').eq('is_active', true),
        sb.from('habit_logs').select('habit_id, date').eq('completed', true).gte('date', since7),
        sb.from('checkins').select('type, date, content').gte('date', since7),
      ])
      for (const r of [goalsRes, msRes, habitsRes, logsRes, ciRes]) if (r.error) throw r.error

      const msByGoal = {}
      for (const m of msRes.data) {
        const g = (msByGoal[m.goal_id] ??= { total: 0, done: 0 })
        g.total++
        if (m.status === 'Completed') g.done++
      }

      const goals = goalsRes.data
        .filter((g) => g.status === 'Active')
        .map((g) => ({
          title: g.title,
          category: g.category,
          milestonesDone: msByGoal[g.id]?.done ?? 0,
          milestonesTotal: msByGoal[g.id]?.total ?? 0,
        }))

      const habits = habitsRes.data.map((h) => ({
        title: h.title,
        completionsThisWeek: logsRes.data.filter((l) => l.habit_id === h.id).length,
      }))

      const ci = ciRes.data
      const blockers = ci
        .filter((c) => c.content?.note)
        .map((c) => c.content.note)
      const checkins = {
        morning: ci.filter((c) => c.type === 'morning').length,
        midday: ci.filter((c) => c.type === 'midday').length,
        evening: ci.filter((c) => c.type === 'evening').length,
        blockers,
      }

      const snapshot = {
        week_start: weekStart(),
        today: iso(new Date()),
        goals,
        habits,
        checkins,
        lifeScore: life ?? null,
      }

      // AI
      const { data, error } = await sb.functions.invoke('weekly-review', { body: snapshot })
      if (error) {
        let msg = error.message
        try {
          const b = await error.context?.json()
          msg = [b?.error, b?.detail].filter(Boolean).join(' — ') || msg
        } catch { /* */ }
        throw new Error(msg)
      }
      if (data?.error) throw new Error(data.error)

      // Persist (upsert per week)
      const { data: row, error: upErr } = await sb
        .from('weekly_reviews')
        .upsert(
          {
            week_start: weekStart(),
            summary: data.summary,
            ai_insights: data.insights,
            score_snapshot: { ...(life ?? {}), adjustments: data.adjustments },
          },
          { onConflict: 'user_id,week_start' },
        )
        .select()
        .single()
      if (upErr) throw upErr
      return row
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['weekly_reviews'] }),
  })
}
