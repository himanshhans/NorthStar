import { useState } from 'react'
import { PageTitle, Card, Button, EmptyState, ErrorState } from '../components/ui'
import Heatmap from '../components/Heatmap'
import { useGoals } from '../hooks/useGoals'
import { todayStr } from '../lib/date'
import {
  useHabits,
  useHabitLogs,
  useCreateHabit,
  useArchiveHabit,
  useToggleHabit,
  completedDates,
  streakFor,
} from '../hooks/useHabits'

const input =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Habits() {
  const { data: habits = [], isLoading, isError, refetch } = useHabits()
  const { data: logs = [] } = useHabitLogs(120)
  const { data: goals = [] } = useGoals({ status: 'Active' })

  const create = useCreateHabit()
  const archive = useArchiveHabit()
  const toggle = useToggleHabit()

  const [showForm, setShowForm] = useState(false)

  // heatmap counts: habits completed per day
  const counts = logs.reduce((acc, l) => {
    acc[l.date] = (acc[l.date] || 0) + 1
    return acc
  }, {})

  const today = todayStr()

  return (
    <>
      <PageTitle
        title="Habits"
        subtitle="Small daily reps compound. Tie them to your goals."
        action={<Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Close' : '+ New habit'}</Button>}
      />

      {showForm && (
        <HabitForm
          goals={goals}
          pending={create.isPending}
          error={create.error}
          onCancel={() => setShowForm(false)}
          onCreate={async (habit) => {
            await create.mutateAsync(habit)
            setShowForm(false)
          }}
        />
      )}

      {isError ? (
        <ErrorState title="Couldn’t load your habits" onRetry={refetch} />
      ) : isLoading ? (
        <p className="text-faint">Loading…</p>
      ) : habits.length === 0 ? (
        <EmptyState
          icon="▦"
          title="No habits yet"
          hint="Add a daily habit — read 30 min, workout, journal — and start a streak."
          action={<Button onClick={() => setShowForm(true)} className="mt-2">+ Add a habit</Button>}
        />
      ) : (
        <>
          <div className="space-y-3">
            {habits.map((h) => {
              const done = completedDates(logs, h.id).has(today)
              const streak = streakFor(logs, h.id)
              const goal = goals.find((g) => g.id === h.goal_id)
              return (
                <Card key={h.id}>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggle.mutate({ habitId: h.id, completed: !done })}
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-md border text-sm transition-colors ${
                        done
                          ? 'border-success bg-success text-white'
                          : 'border-faint text-transparent hover:border-accent'
                      }`}
                    >
                      ✓
                    </button>
                    <div className="flex-1">
                      <p className="font-medium">{h.title}</p>
                      <p className="text-xs text-faint">
                        {labelFreq(h)}{goal ? ` · ◆ ${goal.title}` : ''}
                      </p>
                    </div>
                    <span className="text-sm text-accent" title="current streak">
                      🔥 {streak}
                    </span>
                    <button
                      onClick={() => archive.mutate(h.id)}
                      className="text-faint hover:text-danger"
                      title="Archive habit"
                    >
                      ✕
                    </button>
                  </div>
                </Card>
              )
            })}
          </div>

          <Card className="mt-6">
            <p className="mb-3 text-sm text-muted">Completion heatmap (last ~4 months)</p>
            <Heatmap counts={counts} />
          </Card>
        </>
      )}
    </>
  )
}

function labelFreq(h) {
  if (h.frequency === 'daily') return 'Daily'
  if (h.frequency === 'weekdays') return 'Weekdays'
  if (h.frequency === 'custom' && h.target_days?.length) {
    return h.target_days.map((d) => WEEKDAYS[d]).join(' ')
  }
  return 'Custom'
}

function HabitForm({ goals, onCreate, onCancel, pending, error }) {
  const [title, setTitle] = useState('')
  const [frequency, setFrequency] = useState('daily')
  const [days, setDays] = useState([])
  const [goalId, setGoalId] = useState('')

  const toggleDay = (d) =>
    setDays((arr) => (arr.includes(d) ? arr.filter((x) => x !== d) : [...arr, d].sort()))

  return (
    <Card className="mb-6 max-w-2xl">
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-muted">Habit</label>
          <input className={input} placeholder="e.g. Read 30 min" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-muted">Frequency</label>
            <select className={input} value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekdays">Weekdays</option>
              <option value="custom">Custom days</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted">Link to goal (optional)</label>
            <select className={input} value={goalId} onChange={(e) => setGoalId(e.target.value)}>
              <option value="">None</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
            </select>
          </div>
        </div>

        {frequency === 'custom' && (
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((w, i) => (
              <button
                key={w}
                onClick={() => toggleDay(i)}
                className={`rounded-full px-3 py-1 text-xs transition-colors ${
                  days.includes(i) ? 'bg-accent text-accent-fg' : 'border border-border text-muted hover:bg-surface2'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-danger">{String(error.message || error)}</p>}

        <div className="flex gap-3">
          <Button
            disabled={!title.trim() || pending}
            onClick={() =>
              onCreate({
                title: title.trim(),
                frequency,
                target_days: frequency === 'custom' ? days : [],
                goal_id: goalId || null,
              })
            }
          >
            {pending ? 'Saving…' : 'Add habit'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </div>
    </Card>
  )
}
