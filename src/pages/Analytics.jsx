import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { PageTitle, Card, EmptyState } from '../components/ui'
import Heatmap from '../components/Heatmap'
import { useAnalytics } from '../hooks/useAnalytics'

const ACCENT = '#f43f5e'
const PLUM = '#a855f7'

const axisProps = {
  stroke: 'var(--color-faint)',
  tick: { fill: 'var(--color-faint)', fontSize: 12 },
  tickLine: false,
  axisLine: false,
}

const tooltipStyle = {
  contentStyle: {
    background: 'var(--color-surface)',
    border: '1px solid var(--color-border)',
    borderRadius: 12,
    color: 'var(--color-fg)',
    fontSize: 13,
  },
  labelStyle: { color: 'var(--color-muted)' },
}

export default function Analytics() {
  const { data, isLoading } = useAnalytics()

  if (isLoading) return (<><PageTitle title="Analytics" /><p className="text-faint">Loading…</p></>)

  const { lifeHistory = [], habitWeekly = [], checkinCounts = {} } = data || {}
  const hasAny =
    lifeHistory.length || habitWeekly.some((w) => w.completions) || Object.keys(checkinCounts).length

  return (
    <>
      <PageTitle title="Analytics" subtitle="Your trends over time." />

      {!hasAny ? (
        <EmptyState
          icon="📈"
          title="Not enough data yet"
          hint="Log check-ins, tick habits, and generate a weekly review — charts fill in as you go."
        />
      ) : (
        <div className="space-y-5">
          <Card>
            <p className="mb-4 text-sm text-muted">Life Score over time</p>
            {lifeHistory.length < 2 ? (
              <p className="py-8 text-center text-sm text-faint">
                Need ≥2 weekly reviews to plot a trend. Generate one each week.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={lifeHistory} margin={{ left: -20, right: 8, top: 4 }}>
                  <CartesianGrid stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="week" {...axisProps} />
                  <YAxis domain={[0, 100]} {...axisProps} />
                  <Tooltip {...tooltipStyle} />
                  <Line type="monotone" dataKey="score" stroke={ACCENT} strokeWidth={2.5}
                        dot={{ r: 3, fill: ACCENT }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card>
            <p className="mb-4 text-sm text-muted">Habit completions per week (last 8)</p>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={habitWeekly} margin={{ left: -20, right: 8, top: 4 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="week" {...axisProps} />
                <YAxis allowDecimals={false} {...axisProps} />
                <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--color-surface2)' }} />
                <Bar dataKey="completions" fill={PLUM} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <p className="mb-3 text-sm text-muted">Check-in activity (last ~4 months)</p>
            <Heatmap counts={checkinCounts} />
          </Card>
        </div>
      )}
    </>
  )
}
