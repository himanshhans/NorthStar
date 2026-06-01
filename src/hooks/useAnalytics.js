import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

const iso = (d) => d.toISOString().slice(0, 10)
const daysAgoStr = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return iso(d)
}
const startOfWeek = (dateStr) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() - d.getDay())
  return iso(d)
}
const shortWeek = (dateStr) =>
  new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

export function useAnalytics() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['analytics'],
    queryFn: async () => {
      const since = daysAgoStr(120)
      const [logsRes, ciRes, reviewsRes] = await Promise.all([
        sb.from('habit_logs').select('date').eq('completed', true).gte('date', since),
        sb.from('checkins').select('date').gte('date', since),
        sb.from('weekly_reviews').select('week_start, score_snapshot').order('week_start'),
      ])
      for (const r of [logsRes, ciRes, reviewsRes]) if (r.error) throw r.error

      // Life Score history (from weekly reviews)
      const lifeHistory = reviewsRes.data
        .map((r) => ({ week: shortWeek(r.week_start), score: r.score_snapshot?.score ?? null }))
        .filter((p) => p.score !== null)

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
        week: shortWeek(ws),
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
