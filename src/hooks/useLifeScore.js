import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

const DAY_MS = 86400000
const iso = (d) => d.toISOString().slice(0, 10)
const todayUTC = () => {
  const t = new Date()
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()))
}

// The 7 dates ending today (UTC), with weekday for each.
function last7() {
  const end = todayUTC()
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(end.getTime() - (6 - i) * DAY_MS)
    return { key: iso(d), dow: d.getUTCDay() } // 0=Sun..6=Sat
  })
}

// Is a habit expected on a given weekday, per its frequency?
function expectedOn(habit, dow) {
  if (habit.frequency === 'weekdays') return dow >= 1 && dow <= 5
  if (habit.frequency === 'custom') return (habit.target_days || []).includes(dow)
  return true // daily
}

/**
 * Life Score (0–100): weighted blend of
 *   - milestone progress on active goals, scaled by timeliness (40%)
 *   - check-in consistency, last 7 days (30%)
 *   - habit consistency vs. each habit's OWN expected schedule, last 7 days (30%)
 * Weights renormalize over whichever components have data.
 */
export function useLifeScore() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['life_score'],
    queryFn: async () => {
      const days = last7()
      const since7 = days[0].key
      const todayKey = days[6].key

      const [goalsRes, msRes, ciRes, habitsRes, logsRes] = await Promise.all([
        sb.from('goals').select('id, category').eq('status', 'Active'),
        sb.from('milestones').select('goal_id, status, due_date'),
        sb.from('checkins').select('date').gte('date', since7),
        sb.from('habits').select('id, frequency, target_days').eq('is_active', true),
        sb.from('habit_logs').select('habit_id, date').eq('completed', true).gte('date', since7),
      ])
      for (const r of [goalsRes, msRes, ciRes, habitsRes, logsRes]) if (r.error) throw r.error

      const goals = goalsRes.data
      const activeGoalIds = new Set(goals.map((g) => g.id))

      // ---- milestones: progress × timeliness, per goal ----
      const perGoal = {}
      for (const m of msRes.data) {
        if (!activeGoalIds.has(m.goal_id)) continue
        const g = (perGoal[m.goal_id] ??= { total: 0, done: 0, overdue: 0 })
        g.total++
        if (m.status === 'Completed') g.done++
        else if (m.status !== 'Skipped' && m.due_date && m.due_date < todayKey) g.overdue++
      }
      const goalScore = (g) => {
        if (!g.total) return 0
        const progress = (g.done / g.total) * 100
        // up to 40% haircut when much of the goal is overdue
        const timeliness = 1 - 0.4 * (g.overdue / g.total)
        return progress * timeliness
      }
      const goalScores = Object.values(perGoal).map(goalScore)
      const milestoneScore = goalScores.length
        ? goalScores.reduce((a, b) => a + b, 0) / goalScores.length
        : null

      // ---- check-ins: distinct days with a check-in / 7 ----
      const ciDays = new Set(ciRes.data.map((c) => c.date))
      const checkinScore = (ciDays.size / 7) * 100

      // ---- habits: actual vs. each habit's OWN expected occurrences ----
      const habits = habitsRes.data
      let expected = 0
      for (const h of habits) for (const d of days) if (expectedOn(h, d.dow)) expected++
      const actual = logsRes.data.length
      const habitScore = habits.length && expected > 0
        ? Math.min(100, (actual / expected) * 100)
        : null

      // ---- blend ----
      const comps = [
        [milestoneScore, 0.4],
        [checkinScore, 0.3],
        [habitScore, 0.3],
      ].filter(([v]) => v !== null)
      const wsum = comps.reduce((a, [, w]) => a + w, 0)
      const score = wsum
        ? Math.round(comps.reduce((a, [v, w]) => a + v * w, 0) / wsum)
        : 0

      // ---- per-category (timeliness-aware milestone progress) ----
      const byCategory = {}
      for (const cat of ['Personal', 'Career', 'Learning']) {
        const ids = goals.filter((g) => g.category === cat).map((g) => g.id)
        const scores = ids.map((id) => perGoal[id]).filter(Boolean).map(goalScore)
        byCategory[cat] = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
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
