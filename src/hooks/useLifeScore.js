import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

const daysAgoStr = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

/**
 * Life Score (0–100): weighted blend of
 *   - milestone progress on active goals (40%)
 *   - check-in consistency, last 7 days (30%)
 *   - habit consistency, last 7 days (30%)
 * Weights renormalize over whichever components have data.
 * Also returns a per-category breakdown from milestone progress.
 */
export function useLifeScore() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['life_score'],
    queryFn: async () => {
      const since7 = daysAgoStr(6)

      const [goalsRes, msRes, ciRes, habitsRes, logsRes] = await Promise.all([
        sb.from('goals').select('id, category').eq('status', 'Active'),
        sb.from('milestones').select('goal_id, status'),
        sb.from('checkins').select('date').gte('date', since7),
        sb.from('habits').select('id').eq('is_active', true),
        sb.from('habit_logs').select('date').eq('completed', true).gte('date', since7),
      ])
      for (const r of [goalsRes, msRes, ciRes, habitsRes, logsRes]) {
        if (r.error) throw r.error
      }

      const goals = goalsRes.data
      const milestones = msRes.data
      const activeGoalIds = new Set(goals.map((g) => g.id))

      // milestone progress per active goal
      const perGoal = {}
      for (const m of milestones) {
        if (!activeGoalIds.has(m.goal_id)) continue
        const g = (perGoal[m.goal_id] ??= { total: 0, done: 0 })
        g.total++
        if (m.status === 'Completed') g.done++
      }
      const goalPcts = Object.values(perGoal).map((g) => (g.total ? (g.done / g.total) * 100 : 0))
      const milestoneScore = goalPcts.length
        ? goalPcts.reduce((a, b) => a + b, 0) / goalPcts.length
        : null

      // check-in consistency: distinct days with a check-in / 7
      const ciDays = new Set(ciRes.data.map((c) => c.date))
      const checkinScore = (ciDays.size / 7) * 100

      // habit consistency: completions / (active habits * 7)
      const habitCount = habitsRes.data.length
      const habitScore = habitCount
        ? Math.min(100, (logsRes.data.length / (habitCount * 7)) * 100)
        : null

      // weighted blend over available components
      const comps = [
        [milestoneScore, 0.4],
        [checkinScore, 0.3],
        [habitScore, 0.3],
      ].filter(([v]) => v !== null)
      const wsum = comps.reduce((a, [, w]) => a + w, 0)
      const score = wsum
        ? Math.round(comps.reduce((a, [v, w]) => a + v * w, 0) / wsum)
        : 0

      // per-category from milestone progress
      const byCategory = {}
      for (const cat of ['Personal', 'Career', 'Learning']) {
        const ids = goals.filter((g) => g.category === cat).map((g) => g.id)
        const pcts = ids
          .map((id) => perGoal[id])
          .filter(Boolean)
          .map((g) => (g.total ? (g.done / g.total) * 100 : 0))
        byCategory[cat] = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null
      }

      return {
        score,
        byCategory,
        parts: {
          milestone: milestoneScore === null ? null : Math.round(milestoneScore),
          checkin: Math.round(checkinScore),
          habit: habitScore === null ? null : Math.round(habitScore),
        },
      }
    },
  })
}
