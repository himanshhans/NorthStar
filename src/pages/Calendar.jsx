import { useState } from 'react'
import { PageTitle, Card, Button } from '../components/ui'
import { useCalendar, useAddEvent, useUpdateEvent, useDeleteEvent } from '../hooks/useCalendar'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const iso = (d) => d.toISOString().slice(0, 10)
const todayIso = iso(new Date())
const input =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'
const fmtTime = (t) => (t ? t.slice(0, 5) : null)
const fmtLong = (key) =>
  new Date(key + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

export default function Calendar() {
  const { data, isLoading } = useCalendar()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [selected, setSelected] = useState(null)

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const monthName = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(start.getDate() - start.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const { milestones = {}, checkins = {}, habits = {}, events = {} } = data || {}

  return (
    <>
      <PageTitle
        title="Calendar"
        subtitle="Milestones, check-ins, habits — and click any day to add an event."
        action={
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setCursor(new Date(year, month - 1, 1))}>←</Button>
            <Button variant="subtle" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)) }}>Today</Button>
            <Button variant="ghost" onClick={() => setCursor(new Date(year, month + 1, 1))}>→</Button>
          </div>
        }
      />

      <p className="mb-3 font-display text-lg">{monthName}</p>

      {isLoading ? (
        <p className="text-faint">Loading…</p>
      ) : (
        <Card className="overflow-x-auto p-3">
          <div className="grid min-w-[640px] grid-cols-7 gap-1">
            {DOW.map((d) => (
              <div key={d} className="px-2 py-1 text-xs font-medium text-faint">{d}</div>
            ))}
            {cells.map((d) => {
              const key = iso(d)
              const inMonth = d.getMonth() === month
              const isToday = key === todayIso
              const ms = milestones[key] || []
              const ci = checkins[key]
              const hb = habits[key] || 0
              const ev = events[key] || []
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  title="Click to add an event"
                  className={`min-h-20 rounded-lg border p-1.5 text-left transition-colors hover:border-accent/60 ${
                    inMonth ? 'border-border bg-bg' : 'border-transparent bg-transparent opacity-40'
                  } ${isToday ? 'ring-1 ring-accent' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isToday ? 'font-semibold text-accent' : 'text-muted'}`}>{d.getDate()}</span>
                    <span className="flex gap-0.5">
                      {ev.length > 0 && <span title="event" className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                      {ci?.size > 0 && <span title="check-in" className="h-1.5 w-1.5 rounded-full bg-hilite" />}
                      {hb > 0 && <span title={`${hb} habits`} className="h-1.5 w-1.5 rounded-full bg-success" />}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {ev.slice(0, 2).map((e) => (
                      <div key={e.id} title={e.title} className="truncate rounded bg-amber-500/15 px-1 py-0.5 text-[10px] text-amber-500">
                        {fmtTime(e.time) ? `${fmtTime(e.time)} ` : ''}{e.title}
                      </div>
                    ))}
                    {ms.slice(0, 2).map((m, i) => (
                      <div
                        key={i}
                        title={`${m.title}${m.goal ? ` · ${m.goal}` : ''}`}
                        className={`truncate rounded px-1 py-0.5 text-[10px] ${
                          m.status === 'Completed' ? 'bg-surface2 text-faint line-through' : 'bg-accent/15 text-accent'
                        }`}
                      >
                        ◆ {m.title}
                      </div>
                    ))}
                    {ms.length + ev.length > 4 && <div className="text-[10px] text-faint">+{ms.length + ev.length - 4} more</div>}
                  </div>
                </button>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-faint">
            <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500 align-middle" />event</span>
            <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />milestone</span>
            <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-hilite align-middle" />check-in</span>
            <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />habits</span>
          </div>
        </Card>
      )}

      {selected && (
        <DayModal
          dateKey={selected}
          events={events[selected] || []}
          milestones={milestones[selected] || []}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}

function DayModal({ dateKey, events, milestones, onClose }) {
  const add = useAddEvent()
  const update = useUpdateEvent()
  const del = useDeleteEvent()
  const [editId, setEditId] = useState(null)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [end, setEnd] = useState('')
  const busy = add.isPending || update.isPending
  const err = add.error || update.error

  const reset = () => { setEditId(null); setTitle(''); setTime(''); setEnd('') }
  function startEdit(e) {
    setEditId(e.id); setTitle(e.title); setTime(fmtTime(e.time) || ''); setEnd(e.end_date || '')
  }
  async function save() {
    const payload = { date: dateKey, end_date: end || null, time, title: title.trim() }
    if (editId) await update.mutateAsync({ id: editId, ...payload })
    else await add.mutateAsync(payload)
    reset()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="font-display text-lg">{fmtLong(dateKey)}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-fg">✕</button>
        </div>

        {/* events */}
        {events.length > 0 && (
          <div className="mb-4 space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 text-sm">
                <span className="w-12 shrink-0 text-xs text-amber-500">{fmtTime(e.time) || 'all-day'}</span>
                <span className="flex-1 truncate">
                  {e.title}
                  {e.end_date && e.end_date !== e.date && <span className="ml-1 text-xs text-faint">→ {e.end_date}</span>}
                </span>
                <button onClick={() => startEdit(e)} className="text-faint hover:text-fg" title="Edit">✎</button>
                <button onClick={() => del.mutate(e.id)} className="text-faint hover:text-danger" title="Delete">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* add / edit event */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <input type="time" className={`${input} w-28`} value={time} onChange={(e) => setTime(e.target.value)} aria-label="Time" />
            <input className={input} placeholder="Event title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="text-faint">Ends (optional)</span>
            <input type="date" min={dateKey} className={`${input} w-40`} value={end} onChange={(e) => setEnd(e.target.value)} aria-label="End date" />
          </div>
          {err && <p className="text-sm text-danger">{String(err.message || err)}</p>}
          <div className="flex gap-2">
            <Button onClick={save} disabled={!title.trim() || busy}>
              {busy ? 'Saving…' : editId ? 'Save changes' : '+ Add event'}
            </Button>
            {editId && <Button variant="ghost" onClick={reset}>Cancel</Button>}
          </div>
        </div>

        {/* milestones due that day (read-only context) */}
        {milestones.length > 0 && (
          <div className="mt-4 border-t border-border pt-3">
            <p className="mb-1 text-xs uppercase tracking-wide text-faint">Milestones due</p>
            {milestones.map((m, i) => (
              <p key={i} className="text-sm text-muted">◆ {m.title}{m.goal ? ` · ${m.goal}` : ''}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
