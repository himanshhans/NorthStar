import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle, Card, Button, EmptyState } from '../components/ui'
import { useGoals } from '../hooks/useGoals'

const cats = ['All', 'Personal', 'Career', 'Learning']
const statuses = ['Active', 'Paused', 'Completed', 'Abandoned', 'All']

const statusColor = {
  Active: 'text-success',
  Paused: 'text-accent',
  Completed: 'text-muted',
  Abandoned: 'text-faint',
}

export default function Goals() {
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('Active')

  const { data: goals, isLoading } = useGoals({
    category: category === 'All' ? undefined : category,
    status: status === 'All' ? undefined : status,
  })

  return (
    <>
      <PageTitle
        title="Goals"
        subtitle="Everything you're working toward."
        action={<Button as="link" to="/goals/new">+ New goal</Button>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {cats.map((c) => (
          <Chip key={c} active={category === c} onClick={() => setCategory(c)}>{c}</Chip>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        {statuses.map((s) => (
          <Chip key={s} active={status === s} onClick={() => setStatus(s)}>{s}</Chip>
        ))}
      </div>

      {isLoading ? (
        <p className="text-faint">Loading…</p>
      ) : !goals?.length ? (
        <EmptyState
          title="No goals here"
          hint="Create one and let the AI break it into milestones."
          action={<Button as="link" to="/goals/new" className="mt-2">+ Create a goal</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {goals.map((g) => (
            <Link key={g.id} to={`/goals/${g.id}`}>
              <Card className="h-full transition-colors hover:border-accent/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide text-faint">{g.category}</span>
                  <span className={`text-xs ${statusColor[g.status] || 'text-muted'}`}>{g.status}</span>
                </div>
                <h3 className="mt-2 font-display text-lg">{g.title}</h3>
                {g.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{g.description}</p>}
                {g.target_date && (
                  <p className="mt-3 text-xs text-faint">🎯 {g.target_date}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

function Chip({ active, children, ...props }) {
  return (
    <button
      className={`rounded-full px-3 py-1 text-xs transition-colors ${
        active ? 'bg-accent text-accent-fg' : 'border border-border text-muted hover:bg-surface2'
      }`}
      {...props}
    >
      {children}
    </button>
  )
}
