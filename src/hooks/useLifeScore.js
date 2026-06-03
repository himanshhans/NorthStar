import { useQuery } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

const DAY_MS = 86400000
const iso = (d) => d.toISOString().slice(0, 10)
const todayUTC = () => {
  const t = new Date()
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()))
}
const daysAgo = (n) => iso(new Date(todayUTC().getTime() - n * DAY_MS))

// dates ending today (UTC) with weekday, length n
function lastDays(n) {
  const end = todayUTC()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end.getTime() - (n - 1 - i) * DAY_MS)
    return { key: iso(d), dow: d.getUTCDay() }
  })
}
function expectedOn(habit, dow) {
  if (habit.frequency === 'weekdays') return dow >= 1 && dow <= 5
  if (habit.frequency === 'custom') return (habit.target_days || []).includes(dow)
  return true
}

/**
 * Life Score (0–100) — momentum-aware, smoothed, explainable.
 *   • Goals (40%): blend of attainment + recent momentum (milestones done in last 14d),
 *     scaled by a gentle timeliness factor.
 *   • Check-ins (30%): depth-weighted (evening > morning > midday), recent days weighted more.
 *   • Habits (30%): 7-day rate blended with 30-day adherence, vs each habit's own schedule.
 * Weights renormalize over available components. The raw score is EMA-smoothed against
 * yesterday's snapshot and persisted once per day for the daily trend.
 */
export function useLifeScore() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['life_score'],
    staleTime: 30 * 1000,
    queryFn: async () => {
      const days7 = lastDays(7)
      const days30 = lastDays(30)
      const since7 = days7[0].key
      const since30 = days30[0].key
      const since14 = daysAgo(14)
      const todayKey = days7[6].key

      const [goalsRes, msRes, ciRes, habitsRes, logsRes, snapRes] = await Promise.all([
        sb.from('goals').select('id, category').eq('status', 'Active'),
        sb.from('milestones').select('goal_id, status, due_date, completed_at'),
        sb.from('checkins').select('type, date').gte('date', since7),
        sb.from('habits').select('id, frequency, target_days').eq('is_active', true),
        sb.from('habit_logs').select('date').eq('completed', true).gte('date', since30),
        sb.from('life_score_daily').select('date, score').lt('date', todayKey).order('date', { ascending: false }).limit(1),
      ])
      for (const r of [goalsRes, msRes, ciRes, habitsRes, logsRes, snapRes]) if (r.error) throw r.error

      const goals = goalsRes.data
      const activeIds = new Set(goals.map((g) => g.id))

      // ---- Goals: attainment + momentum, gentle timeliness ----
      const perGoal = {}
      let totalMs = 0, overdueMs = 0, recentDone = 0
      for (const m of msRes.data) {
        if (!activeIds.has(m.goal_id)) continue
        const g = (perGoal[m.goal_id] ??= { total: 0, done: 0, overdue: 0 })
        g.total++; totalMs++
        if (m.status === 'Completed') {
          g.done++
          if (m.completed_at && iso(new Date(m.completed_at)) >= since14) recentDone++
        } else if (m.status !== 'Skipped' && m.due_date && m.due_date < todayKey) {
          g.overdue++; overdueMs++
        }
      }
      const goalAttain = (g) => (g.total ? (g.done / g.total) * 100 : 0)
      const attainScores = Object.values(perGoal).map(goalAttain)
      const attainment = attainScores.length ? attainScores.reduce((a, b) => a + b, 0) / attainScores.length : null
      const momentum = Math.min(100, recentDone * 25) // ~4 milestones / 2 weeks = full momentum
      const timeliness = totalMs ? 1 - 0.25 * (overdueMs / totalMs) : 1
      const milestoneScore = attainment === null
        ? null
        : (0.5 * attainment + 0.5 * momentum) * timeliness

      // ---- Check-ins: depth-weighted with recency decay ----
      const byDate = {}
      for (const c of ciRes.data) (byDate[c.date] ??= new Set()).add(c.type)
      let ciNum = 0, ciDen = 0
      days7.forEach((d, i) => {
        const w = Math.pow(0.85, 6 - i) // today weighs most
        const types = byDate[d.key] || new Set()
        const dayVal = Math.min(1, 0.6 * (types.has('morning') ? 1 : 0) + 0.4 * (types.has('midday') ? 1 : 0) + 1.0 * (types.has('evening') ? 1 : 0))
        ciNum += w * dayVal; ciDen += w
      })
      const checkinScore = ciDen ? (ciNum / ciDen) * 100 : 0

      // ---- Habits: 7-day rate blended with 30-day adherence ----
      const habits = habitsRes.data
      const logDates = logsRes.data.map((l) => l.date)
      let exp7 = 0, exp30 = 0
      for (const h of habits) {
        for (const d of days30) if (expectedOn(h, d.dow)) exp30++
        for (const d of days7) if (expectedOn(h, d.dow)) exp7++
      }
      const act7 = logDates.filter((d) => d >= since7).length
      const act30 = logDates.length
      const rate7 = exp7 ? Math.min(1, act7 / exp7) : null
      const rate30 = exp30 ? Math.min(1, act30 / exp30) : null
      const habitScore = !habits.length || rate7 === null
        ? null
        : (rate30 === null ? rate7 : 0.6 * rate7 + 0.4 * rate30) * 100

      // ---- blend ----
      const comps = [
        [milestoneScore, 0.4],
        [checkinScore, 0.3],
        [habitScore, 0.3],
      ].filter(([v]) => v !== null)
      const wsum = comps.reduce((a, [, w]) => a + w, 0)
      const raw = wsum ? Math.round(comps.reduce((a, [v, w]) => a + v * w, 0) / wsum) : 0

      // ---- EMA smoothing vs last snapshot ----
      const prev = snapRes.data?.[0]?.score
      const score = typeof prev === 'number' ? Math.round(prev * 0.6 + raw * 0.4) : raw

      const parts = {
        milestone: milestoneScore === null ? null : Math.round(milestoneScore),
        checkin: Math.round(checkinScore),
        habit: habitScore === null ? null : Math.round(habitScore),
      }

      // persist today's snapshot (idempotent)
      try {
        await sb.from('life_score_daily').upsert({ date: todayKey, score, parts }, { onConflict: 'user_id,date' })
      } catch { /* snapshot best-effort */ }

      // ---- per-category (attainment × timeliness) ----
      const byCategory = {}
      for (const cat of ['Personal', 'Career', 'Learning']) {
        const ids = goals.filter((g) => g.category === cat).map((g) => g.id)
        const sc = ids.map((id) => perGoal[id]).filter(Boolean).map((g) => goalAttain(g) * timeliness)
        byCategory[cat] = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null
      }

      // ---- explainability ----
      const labels = { milestone: 'Goal progress', checkin: 'Check-ins', habit: 'Habits' }
      const present = Object.entries(parts).filter(([, v]) => v !== null)
      let hint = null
      if (present.length) {
        const [key, val] = present.reduce((lo, cur) => (cur[1] < lo[1] ? cur : lo))
        if (val < 60) hint = `${labels[key]} is dragging your score — focus there.`
        else if (score >= 80) hint = 'Strong week — keep the momentum.'
      }

      return { score, raw, byCategory, parts, hint }
    },
  })
}
