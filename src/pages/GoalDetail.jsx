import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { PageTitle, Card, Button, ProgressBar } from '../components/ui'
import {
  useGoal, useToggleMilestone, useUpdateGoalStatus, useUpdateGoalNotes,
  isOverdue, useRescheduleMilestone, useReplanMilestone, useGenerateTips,
  useDeleteGoal, useEditMilestone,
} from '../hooks/useGoals'
import MilestoneBoard from '../components/MilestoneBoard'
import { renderMarkdown } from '../lib/markdown'

const statusOptions = ['Active', 'Paused', 'Completed', 'Abandoned']
const mInput =
  'w-full rounded-lg border border-border bg-bg px-2.5 py-1.5 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'

export default function GoalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: goal, isLoading } = useGoal(id)
  const toggle = useToggleMilestone()
  const updateStatus = useUpdateGoalStatus()
  const del = useDeleteGoal()
  const edit = useEditMilestone()
  const [view, setView] = useState('timeline')
  const [editId, setEditId] = useState(null)
  const [draft, setDraft] = useState({})

  if (isLoading) return <p className="text-faint">Loading…</p>
  if (!goal) return <p className="text-faint">Goal not found. <Link to="/goals" className="text-accent">Back</Link></p>

  const ms = goal.milestones || []
  const done = ms.filter((m) => m.status === 'Completed').length
  const pct = ms.length ? Math.round((done / ms.length) * 100) : 0
  const overdue = ms.filter(isOverdue)

  const startEdit = (m) => {
    setEditId(m.id)
    setDraft({ title: m.title, description: m.description || '', due_date: m.due_date || '' })
  }
  const saveEdit = async () => {
    await edit.mutateAsync({ id: editId, goalId: goal.id, patch: draft })
    setEditId(null)
  }
  async function handleDelete() {
    if (!confirm(`Delete "${goal.title}" and all its milestones? This cannot be undone.`)) return
    await del.mutateAsync(goal.id)
    navigate('/goals')
  }

  return (
    <>
      <PageTitle
        title={goal.title}
        subtitle={`${goal.category}${goal.target_date ? ` · 🎯 ${goal.target_date}` : ''}`}
        action={
          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg"
              value={goal.status}
              onChange={(e) => updateStatus.mutate({ id: goal.id, status: e.target.value })}
            >
              {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={handleDelete}
              disabled={del.isPending}
              title="Delete goal"
              className="rounded-lg border border-border px-2.5 py-2 text-sm text-faint hover:border-danger hover:text-danger"
            >
              🗑
            </button>
          </div>
        }
      />

      {goal.description && <p className="mb-6 max-w-2xl text-muted">{goal.description}</p>}

      <GoalTips goal={goal} />

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
                    {editId === m.id ? (
                      <div className="space-y-2">
                        <input
                          className={mInput}
                          value={draft.title}
                          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                        />
                        <textarea
                          className={`${mInput} min-h-14`}
                          value={draft.description}
                          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                        />
                        <input
                          type="date"
                          className={mInput}
                          value={draft.due_date || ''}
                          onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))}
                        />
                        <div className="flex gap-2">
                          <Button onClick={saveEdit} disabled={edit.isPending}>
                            {edit.isPending ? 'Saving…' : 'Save'}
                          </Button>
                          <Button variant="ghost" onClick={() => setEditId(null)}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="group flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={`font-medium ${isDone ? 'line-through' : ''}`}>{m.title}</p>
                          {m.description && <p className="mt-1 text-sm text-muted">{m.description}</p>}
                          {m.due_date && (
                            <p className={`mt-2 text-xs ${over ? 'text-danger' : 'text-faint'}`}>
                              {isSkipped ? 'skipped' : `due ${m.due_date}`}
                              {over ? ' · overdue' : ''}
                            </p>
                          )}
                        </div>
                        {!isSkipped && (
                          <button
                            onClick={() => startEdit(m)}
                            title="Edit milestone"
                            className="text-faint opacity-0 transition-opacity hover:text-fg group-hover:opacity-100"
                          >
                            ✎
                          </button>
                        )}
                      </div>
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

function GoalTips({ goal }) {
  const generate = useGenerateTips()
  const tips = goal.tips || []
  const tried = useRef(false)

  // Auto-generate once when a goal has no tips yet.
  useEffect(() => {
    if (!tried.current && tips.length === 0 && !generate.isPending) {
      tried.current = true
      generate.mutate(goal)
    }
  }, [goal.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (tips.length === 0 && !generate.isPending && !generate.isError) return null

  return (
    <Card className="mb-6 max-w-2xl border-hilite/30 bg-hilite/5">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-medium text-hilite">💡 Tips to succeed</p>
        {tips.length > 0 && (
          <button
            onClick={() => generate.mutate(goal)}
            disabled={generate.isPending}
            className="text-xs text-faint hover:text-fg"
          >
            {generate.isPending ? 'Refreshing…' : 'Regenerate'}
          </button>
        )}
      </div>

      {generate.isPending && tips.length === 0 ? (
        <p className="text-sm text-muted">Gathering tips for this goal…</p>
      ) : generate.isError && tips.length === 0 ? (
        <p className="text-sm text-danger">{String(generate.error.message || generate.error)}</p>
      ) : (
        <ul className="space-y-2">
          {tips.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm text-fg">
              <span className="text-hilite">•</span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
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
