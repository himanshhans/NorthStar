import { useState } from 'react'
import { PageTitle, Card, Button } from '../components/ui'
import { useTodayCheckin, useSubmitCheckin } from '../hooks/useCheckins'

const input =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'

const options = [
  { key: 'on_track', icon: '✅', label: 'On track', hint: 'Cruising — keep going' },
  { key: 'slow', icon: '🐢', label: 'Slow', hint: 'Behind but moving' },
  { key: 'blocked', icon: '⛔', label: 'Blocked', hint: 'Stuck on something' },
]

export default function CheckinMidday() {
  const { data: existing, isLoading } = useTodayCheckin('midday')
  const submit = useSubmitCheckin('midday')

  const [status, setStatus] = useState(null)
  const [note, setNote] = useState('')
  const [redo, setRedo] = useState(false)

  async function pick(key) {
    setStatus(key)
    // one-tap: 'on_track' submits immediately; blocked/slow let user add a note
    if (key === 'on_track') {
      await submit.mutateAsync({ status: key })
      setRedo(false)
    }
  }

  async function submitWithNote() {
    await submit.mutateAsync({ status, note: note.trim() || null })
    setRedo(false)
    setNote('')
  }

  const done = existing && !redo
  const chosen = done ? options.find((o) => o.key === existing.content?.status) : null

  return (
    <>
      <PageTitle
        title="Mid-day nudge"
        subtitle="Quick pulse check. One tap."
        action={done ? <Button variant="ghost" onClick={() => { setRedo(true); setStatus(null) }}>Update</Button> : null}
      />

      {isLoading ? (
        <p className="text-faint">Loading…</p>
      ) : done ? (
        <Card className="max-w-md">
          <p className="text-sm text-muted">Logged for today</p>
          <p className="mt-2 text-2xl">{chosen?.icon} <span className="font-display">{chosen?.label}</span></p>
          {existing.content?.note && <p className="mt-2 text-sm text-muted">“{existing.content.note}”</p>}
        </Card>
      ) : (
        <div className="max-w-md space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {options.map((o) => (
              <button
                key={o.key}
                onClick={() => pick(o.key)}
                disabled={submit.isPending}
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

          {(status === 'slow' || status === 'blocked') && (
            <div className="space-y-3">
              <textarea
                className={`${input} min-h-20`}
                placeholder="What's the blocker? (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button onClick={submitWithNote} disabled={submit.isPending}>
                {submit.isPending ? 'Saving…' : 'Log it'}
              </Button>
            </div>
          )}

          {submit.isError && <p className="text-sm text-danger">{String(submit.error.message || submit.error)}</p>}
        </div>
      )}
    </>
  )
}
