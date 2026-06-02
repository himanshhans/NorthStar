import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle, Card, Button } from '../components/ui'
import { useTodayCheckin, useSubmitMidday } from '../hooks/useCheckins'

const input =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'

const options = [
  { key: 'on_track', icon: '✅', label: 'On track', hint: 'Cruising' },
  { key: 'slow', icon: '🐢', label: 'Slow', hint: 'Behind but moving' },
  { key: 'blocked', icon: '⛔', label: 'Blocked', hint: 'Stuck' },
]

export default function CheckinMidday() {
  const { data: existing, isLoading } = useTodayCheckin('midday')
  const { data: morning } = useTodayCheckin('morning')
  const submit = useSubmitMidday()

  const [status, setStatus] = useState(null)
  const [note, setNote] = useState('')
  const [tasks, setTasks] = useState([])
  const [redo, setRedo] = useState(false)

  // seed task checklist from this morning's focus tasks
  useEffect(() => {
    const mt = morning?.content?.tasks
    if (mt?.length && tasks.length === 0) {
      setTasks(mt.map((t) => ({ text: t.text, done: false })))
    }
  }, [morning]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleTask = (i) =>
    setTasks((arr) => arr.map((t, idx) => (idx === i ? { ...t, done: !t.done } : t)))

  async function handleSubmit() {
    await submit.mutateAsync({ content: { status, note: note.trim() || null, tasks } })
    setRedo(false)
  }

  const done = existing && !redo
  const chosen = done ? options.find((o) => o.key === existing.content?.status) : null
  const doneCount = tasks.filter((t) => t.done).length

  return (
    <>
      <PageTitle
        title="Mid-day nudge"
        subtitle="Quick pulse check — where are you on today's focus?"
        action={done ? <Button variant="ghost" onClick={() => { setRedo(true); setStatus(null) }}>Update</Button> : null}
      />

      {isLoading ? (
        <p className="text-faint">Loading…</p>
      ) : done ? (
        <div className="max-w-md space-y-4">
          <Card>
            <p className="text-sm text-muted">Logged for today</p>
            <p className="mt-2 text-2xl">{chosen?.icon} <span className="font-display">{chosen?.label}</span></p>
            {existing.content?.tasks?.length > 0 && (
              <p className="mt-2 text-sm text-muted">
                {existing.content.tasks.filter((t) => t.done).length}/{existing.content.tasks.length} focus tasks done
              </p>
            )}
            {existing.content?.note && <p className="mt-2 text-sm text-muted">“{existing.content.note}”</p>}
          </Card>
          {existing.ai_response && (
            <Card className="border-accent/30 bg-accent/5">
              <p className="mb-1 text-sm text-accent">★ NorthStar</p>
              <p className="text-sm leading-relaxed text-fg">{existing.ai_response}</p>
            </Card>
          )}
        </div>
      ) : (
        <div className="max-w-md space-y-5">
          {/* today's focus from morning intention */}
          {tasks.length > 0 ? (
            <Card>
              <p className="mb-3 text-sm text-muted">Today's focus — tick what's done</p>
              <div className="space-y-2">
                {tasks.map((t, i) => (
                  <button
                    key={i}
                    onClick={() => toggleTask(i)}
                    className="flex w-full items-center gap-3 text-left text-sm"
                  >
                    <span
                      className={`grid h-5 w-5 shrink-0 place-items-center rounded border text-xs ${
                        t.done ? 'border-success bg-success text-white' : 'border-faint text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <span className={t.done ? 'text-faint line-through' : ''}>{t.text}</span>
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-faint">{doneCount}/{tasks.length} done</p>
            </Card>
          ) : (
            <p className="text-sm text-faint">
              No focus tasks set today. <Link to="/checkin/morning" className="text-accent">Set a morning intention</Link> to track progress here.
            </p>
          )}

          {/* status */}
          <div>
            <p className="mb-2 text-sm text-muted">How's it going?</p>
            <div className="grid grid-cols-3 gap-3">
              {options.map((o) => (
                <button
                  key={o.key}
                  onClick={() => setStatus(o.key)}
                  className={`rounded-xl border p-4 text-center transition-colors ${
                    status === o.key ? 'border-accent bg-accent/5' : 'border-border bg-surface hover:bg-surface2'
                  }`}
                >
                  <div className="text-2xl">{o.icon}</div>
                  <div className="mt-1 text-sm font-medium">{o.label}</div>
                  <div className="text-xs text-faint">{o.hint}</div>
                </button>
              ))}
            </div>
          </div>

          {(status === 'slow' || status === 'blocked') && (
            <textarea
              className={`${input} min-h-20`}
              placeholder="What's slowing you down? (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          )}

          {submit.isError && <p className="text-sm text-danger">{String(submit.error.message || submit.error)}</p>}

          <div className="flex gap-3">
            <Button onClick={handleSubmit} disabled={!status || submit.isPending}>
              {submit.isPending ? 'Saving…' : 'Log nudge'}
            </Button>
            {redo && <Button variant="ghost" onClick={() => setRedo(false)}>Cancel</Button>}
          </div>
        </div>
      )}
    </>
  )
}
