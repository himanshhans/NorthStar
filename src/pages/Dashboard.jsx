import { useUser } from '@clerk/clerk-react'
import { Link } from 'react-router-dom'
import { PageTitle, Card, Button, ProgressBar, Skeleton } from '../components/ui'
import { useGoals } from '../hooks/useGoals'
import { useTodayCheckin } from '../hooks/useCheckins'
import { useLifeScore } from '../hooks/useLifeScore'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

export default function Dashboard() {
  const { user } = useUser()
  const name = user?.firstName || 'there'

  const { data: goals = [], isLoading } = useGoals({ status: 'Active' })
  const { data: morning } = useTodayCheckin('morning')
  const focusTasks = morning?.content?.tasks || []
  const { data: life } = useLifeScore()
  const lifeScore = life?.score ?? 0

  return (
    <>
      <PageTitle
        title={`${greeting()}, ${name}`}
        subtitle="Here's where you stand today."
        action={<Button as="link" to="/goals/new">+ New goal</Button>}
      />

      <div className="grid gap-5 md:grid-cols-3">
        <Card className="md:col-span-1">
          <p className="text-sm text-muted">Life Score</p>
          <p className="mt-2 bg-linear-to-r from-accent to-hilite bg-clip-text font-display text-5xl font-semibold text-transparent">
            {lifeScore}
          </p>
          <ProgressBar value={lifeScore} className="mt-3" />
          <div className="mt-4 space-y-2">
            {['Personal', 'Career', 'Learning'].map((cat) => {
              const v = life?.byCategory?.[cat]
              return (
                <div key={cat} className="flex items-center gap-2">
                  <span className="w-16 text-xs text-faint">{cat}</span>
                  <ProgressBar value={v ?? 0} className="flex-1" />
                  <span className="w-8 text-right text-xs text-muted">{v ?? '—'}</span>
                </div>
              )
            })}
          </div>
        </Card>

        <Card className="md:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-muted">Today's focus</p>
            <Button as="link" to="/checkin/morning" variant="subtle">
              {focusTasks.length ? 'Edit' : 'Set intentions'}
            </Button>
          </div>
          {focusTasks.length ? (
            <ul className="space-y-2">
              {focusTasks.map((t, i) => {
                const g = goals.find((x) => x.id === t.goalId)
                return (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <span className="text-accent">◆</span>
                    <span>{t.text}</span>
                    {g && <span className="text-xs text-faint">· {g.title}</span>}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-faint">
              No focus tasks yet. Start your morning intention to set 1–3.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <Button as="link" to="/checkin/evening" variant="ghost">☾ Evening reflection</Button>
        <Button as="link" to="/habits" variant="ghost">▦ Habits</Button>
        <Button as="link" to="/review" variant="ghost">❧ Weekly review</Button>
      </div>

      <h2 className="mb-3 mt-8 font-display text-xl">Active goals</h2>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : goals.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-8 text-center sm:flex-row sm:justify-between sm:py-5 sm:text-left">
          <div>
            <p className="font-display text-base">No goals yet</p>
            <p className="text-sm text-muted">Create your first goal — AI breaks it into milestones.</p>
          </div>
          <Button as="link" to="/goals/new">+ Create a goal</Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.slice(0, 4).map((g) => (
            <Link key={g.id} to={`/goals/${g.id}`}>
              <Card className="h-full transition-colors hover:border-accent/50">
                <span className="text-xs uppercase tracking-wide text-faint">{g.category}</span>
                <h3 className="mt-1 font-display text-lg">{g.title}</h3>
                {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{g.description}</p>}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}
