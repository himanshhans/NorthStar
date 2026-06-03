import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

// All UTC, to stay consistent with how dates are stored (toISOString) and the heatmap.
const DAY_MS = 86400000
const iso = (d) => d.toISOString().slice(0, 10)
const todayUTC = () => {
  const t = new Date()
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()))
}
const daysAgoStr = (n) => iso(new Date(todayUTC().getTime() - n * DAY_MS))
// Monday-based week start (so the current week reads as e.g. "Jun 1", not the prior Sunday).
const startOfWeek = (dateStr) => {
  const d = new Date(dateStr + 'T00:00:00Z')
  const back = (d.getUTCDay() + 6) % 7 // days since Monday
  d.setUTCDate(d.getUTCDate() - back)
  return iso(d)
}
const shortDay = (dateStr) =>
  new Date(dateStr + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' })

export function useAnalytics() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const since = daysAgoStr(120)
      const [logsRes, ciRes, scoreRes] = await Promise.all([
        sb.from('habit_logs').select('date').eq('completed', true).gte('date', since),
        sb.from('checkins').select('date').gte('date', since),
        sb.from('life_score_daily').select('date, score').gte('date', daysAgoStr(60)).order('date'),
      ])
      for (const r of [logsRes, ciRes, scoreRes]) if (r.error) throw r.error

      // Life Score history (smoothed daily snapshots)
      const lifeHistory = scoreRes.data.map((r) => ({ week: shortDay(r.date), score: r.score }))

      // Habit completions per week (last 8 weeks)
      const weeks = []
      for (let i = 7; i >= 0; i--) {
        const ws = startOfWeek(daysAgoStr(i * 7))
        weeks.push(ws)
      }
      const weekSet = new Map(weeks.map((w) => [w, 0]))
      for (const l of logsRes.data) {
        const ws = startOfWeek(l.date)
        if (weekSet.has(ws)) weekSet.set(ws, weekSet.get(ws) + 1)
      }
      const habitWeekly = [...weekSet.entries()].map(([ws, count]) => ({
        week: shortDay(ws),
        completions: count,
      }))

      // Check-in counts per day (for heatmap)
      const checkinCounts = ciRes.data.reduce((acc, c) => {
        acc[c.date] = (acc[c.date] || 0) + 1
        return acc
      }, {})

      return { lifeHistory, habitWeekly, checkinCounts }
    },
  })
}
