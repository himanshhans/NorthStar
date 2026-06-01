import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageTitle, Card, Button, ProgressBar } from '../components/ui'
import {
  useGoal, useToggleMilestone, useUpdateGoalStatus, useUpdateGoalNotes,
  isOverdue, useRescheduleMilestone, useReplanMilestone,
} from '../hooks/useGoals'
import MilestoneBoard from '../components/MilestoneBoard'
import { renderMarkdown } from '../lib/markdown'

const statusOptions = ['Active', 'Paused', 'Completed', 'Abandoned']

export default function GoalDetail() {
  const { id } = useParams()
  const { data: goal, isLoading } = useGoal(id)
  const toggle = useToggleMilestone()
  const updateStatus = useUpdateGoalStatus()
  const [view, setView] = useState('timeline')

  if (isLoading) return <p className="text-faint">Loading…</p>
  if (!goal) return <p className="text-faint">Goal not found. <Link to="/goals" className="text-accent">Back</Link></p>

  const ms = goal.milestones || []
  const done = ms.filter((m) => m.status === 'Completed').length
  const pct = ms.length ? Math.round((done / ms.length) * 100) : 0
  const overdue = ms.filter(isOverdue)

  return (
    <>
      <PageTitle
        title={goal.title}
        subtitle={`${goal.category}${goal.target_date ? ` · 🎯 ${goal.target_date}` : ''}`}
        action={
          <select
            className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
            value={goal.status}
            onChange={(e) => updateStatus.mutate({ id: goal.id, status: e.target.value })}
          >
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        }
      />

      {goal.description && <p className="mb-6 max-w-2xl text-muted">{goal.description}</p>}

      <Card className="mb-6 max-w-2xl">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="text-muted">Progress</span>
          <span className="text-fg">{done}/{ms.length} milestones · {pct}%</span>
        </div>
        <ProgressBar value={pct} />
      </Card>

      {overdue.length > 0 && <RecoverySection goal={goal} overdue={overdue} />}

      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl">Roadmap</h2>
        {ms.length > 0 && (
          <div className="flex gap-1 rounded-lg border border-border p-0.5 text-xs">
            <button
              onClick={() => setView('timeline')}
              className={`rounded px-2.5 py-1 ${view === 'timeline' ? 'bg-surface2 text-fg' : 'text-muted'}`}
            >
              Timeline
            </button>
            <button
              onClick={() => setView('board')}
              className={`rounded px-2.5 py-1 ${view === 'board' ? 'bg-surface2 text-fg' : 'text-muted'}`}
            >
              Board
            </button>
          </div>
        )}
      </div>
      {!ms.length ? (
        <p className="text-faint">No milestones yet.</p>
      ) : view === 'board' ? (
        <MilestoneBoard goal={goal} />
      ) : (
        <div className="relative max-w-2xl">
          {/* timeline rail */}
          <div className="absolute bottom-2 left-2.75 top-2 w-px bg-border" />
          <div className="space-y-4">
            {ms.map((m) => {
              const isDone = m.status === 'Completed'
              const isSkipped = m.status === 'Skipped'
              const over = isOverdue(m)
              const dot = isDone
                ? 'border-success bg-success text-white'
                : isSkipped
                ? 'border-border bg-surface2 text-faint'
                : over
                ? 'border-danger text-transparent hover:border-danger'
                : 'border-faint text-transparent hover:border-accent'
              return (
                <div key={m.id} className="relative flex gap-4">
                  <button
                    onClick={() =>
                      !isSkipped &&
                      toggle.mutate({ id: m.id, goalId: goal.id, status: isDone ? 'Pending' : 'Completed' })
                    }
                    className={`z-10 mt-1 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 bg-bg text-xs transition-colors ${dot}`}
                    title={isSkipped ? 'Replaced by smaller steps' : isDone ? 'Mark incomplete' : 'Mark complete'}
                  >
                    {isDone ? '✓' : ''}
                  </button>
                  <Card className={`flex-1 ${isDone || isSkipped ? 'opacity-60' : ''}`}>
                    <p className={`font-medium ${isDone ? 'line-through' : ''}`}>{m.title}</p>
                    {m.description && <p className="mt-1 text-sm text-muted">{m.description}</p>}
                    {m.due_date && (
                      <p className={`mt-2 text-xs ${over ? 'text-danger' : 'text-faint'}`}>
                        {isSkipped ? 'skipped' : `due ${m.due_date}`}
                        {over ? ' · overdue' : ''}
                      </p>
                    )}
                  </Card>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <GoalNotes goal={goal} />
    </>
  )
}

function GoalNotes({ goal }) {
  const save = useUpdateGoalNotes()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(goal.notes || '')

  return (
    <div className="mt-10 max-w-2xl">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl">Notes</h2>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => { setText(goal.notes || ''); setEditing(false) }}>Cancel</Button>
            <Button
              disabled={save.isPending}
              onClick={async () => { await save.mutateAsync({ id: goal.id, notes: text }); setEditing(false) }}
            >
              {save.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setEditing(true)}>{goal.notes ? 'Edit' : '+ Add notes'}</Button>
        )}
      </div>

      {editing ? (
        <>
          <textarea
            className="min-h-40 w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
            placeholder="Markdown supported — **bold**, - lists, ## headings, [links](url)…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <p className="mt-1 text-xs text-faint">Markdown supported.</p>
        </>
      ) : goal.notes ? (
        <Card>
          <div
            className="prose-notes text-sm leading-relaxed text-fg"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(goal.notes) }}
          />
        </Card>
      ) : (
        <p className="text-sm text-faint">No notes yet. Capture research, links, or thoughts for this goal.</p>
      )}
    </div>
  )
}

function RecoverySection({ goal, overdue }) {
  const reschedule = useRescheduleMilestone()
  const replan = useReplanMilestone()
  const [active, setActive] = useState(null) // milestone id being re-planned
  const [reason, setReason] = useState('')

  return (
    <Card className="mb-6 max-w-2xl border-danger/40 bg-danger/5">
      <p className="font-display text-base text-fg">
        ⚠ {overdue.length} milestone{overdue.length > 1 ? 's' : ''} slipped
      </p>
      <p className="mt-1 text-sm text-muted">No guilt — let's get back on track.</p>

      <div className="mt-4 space-y-4">
        {overdue.map((m) => (
          <div key={m.id} className="rounded-lg border border-border bg-surface p-3">
            <p className="text-sm font-medium">{m.title}</p>
            <p className="text-xs text-danger">was due {m.due_date}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="subtle"
                onClick={() => reschedule.mutate({ id: m.id, goalId: goal.id, days: 7 })}
                disabled={reschedule.isPending}
              >
                ↻ Push 1 week
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setActive(active === m.id ? null : m.id); setReason('') }}
              >
                ✦ Break into smaller steps
              </Button>
            </div>

            {active === m.id && (
              <div className="mt-3 space-y-2">
                <textarea
                  className="min-h-16 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
                  placeholder="What happened? (optional — helps the AI re-plan)"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                {replan.isError && (
                  <p className="text-sm text-danger">{String(replan.error.message || replan.error)}</p>
                )}
                <Button
                  disabled={replan.isPending}
                  onClick={async () => {
                    await replan.mutateAsync({ goal, milestone: m, reason })
                    setActive(null)
                    setReason('')
                  }}
                >
                  {replan.isPending ? 'Re-planning…' : 'Generate smaller steps'}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
