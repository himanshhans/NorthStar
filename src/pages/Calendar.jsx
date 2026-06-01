import { useState } from 'react'
import { PageTitle, Card, Button } from '../components/ui'
import { useCalendar } from '../hooks/useCalendar'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const iso = (d) => d.toISOString().slice(0, 10)
const todayIso = iso(new Date())

export default function Calendar() {
  const { data, isLoading } = useCalendar()
  const [cursor, setCursor] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const monthName = cursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  // build 6-week grid
  const first = new Date(year, month, 1)
  const start = new Date(first)
  start.setDate(start.getDate() - start.getDay())
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    return d
  })

  const { milestones = {}, checkins = {}, habits = {} } = data || {}

  return (
    <>
      <PageTitle
        title="Calendar"
        subtitle="Milestones, check-ins, and habit reps across the month."
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
              return (
                <div
                  key={key}
                  className={`min-h-20 rounded-lg border p-1.5 text-left ${
                    inMonth ? 'border-border bg-bg' : 'border-transparent bg-transparent opacity-40'
                  } ${isToday ? 'ring-1 ring-accent' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs ${isToday ? 'font-semibold text-accent' : 'text-muted'}`}>{d.getDate()}</span>
                    <span className="flex gap-0.5">
                      {ci?.size > 0 && <span title="check-in" className="h-1.5 w-1.5 rounded-full bg-hilite" />}
                      {hb > 0 && <span title={`${hb} habits`} className="h-1.5 w-1.5 rounded-full bg-success" />}
                    </span>
                  </div>
                  <div className="mt-1 space-y-0.5">
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
                    {ms.length > 2 && <div className="text-[10px] text-faint">+{ms.length - 2} more</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex gap-4 text-xs text-faint">
            <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" />milestone</span>
            <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-hilite align-middle" />check-in</span>
            <span><span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-success align-middle" />habits</span>
          </div>
        </Card>
      )}
    </>
  )
}
