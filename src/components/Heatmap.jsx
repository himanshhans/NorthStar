// Contribution heatmap: fills the container width (responsive square cells),
// with month + weekday labels and a legend. Dates handled in UTC to match
// how logs/check-ins are stored.
const DAY_MS = 86400000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const key = (d) => d.toISOString().slice(0, 10)
function todayUTC() {
  const t = new Date()
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()))
}

// absolute buckets so 1 rep = light, more-per-day = darker (not relative to your max)
function level(count) {
  if (count >= 5) return 4
  if (count >= 3) return 3
  if (count >= 2) return 2
  if (count >= 1) return 1
  return 0
}
const bg = (lvl) =>
  lvl === 0
    ? 'var(--color-surface2)'
    : `color-mix(in srgb, var(--color-accent) ${[0, 25, 45, 70, 100][lvl]}%, transparent)`

export default function Heatmap({ counts = {}, weeks = 26 }) {
  const today = todayUTC()
  const start = new Date(today.getTime() - (weeks * 7 - 1) * DAY_MS)
  start.setUTCDate(start.getUTCDate() - start.getUTCDay()) // snap to Sunday

  const cols = []
  let cursor = new Date(start)
  while (cursor <= today) {
    const col = []
    for (let i = 0; i < 7; i++) {
      col.push(cursor <= today ? { k: key(cursor), count: counts[key(cursor)] || 0 } : null)
      cursor = new Date(cursor.getTime() + DAY_MS)
    }
    cols.push(col)
  }

  let lastMonth = -1
  const monthLabels = cols.map((col) => {
    const first = col.find(Boolean)
    if (!first) return ''
    const m = new Date(first.k).getUTCMonth()
    if (m !== lastMonth) { lastMonth = m; return MONTHS[m] }
    return ''
  })

  return (
    <div className="w-full">
      {/* month labels */}
      <div className="mb-1 flex pl-8 text-[10px] text-faint">
        {monthLabels.map((m, i) => (
          <div key={i} className="min-w-0 flex-1">
            {m && <span className="whitespace-nowrap">{m}</span>}
          </div>
        ))}
      </div>

      <div className="flex gap-0.5">
        {/* weekday labels */}
        <div className="flex w-7 shrink-0 flex-col gap-0.5 text-[10px] text-faint">
          {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
            <div key={i} className="flex flex-1 items-center leading-none">{d}</div>
          ))}
        </div>
        {/* grid — columns flex to fill width, cells stay square */}
        <div className="flex flex-1 gap-0.5">
          {cols.map((col, ci) => (
            <div key={ci} className="flex min-w-0 flex-1 flex-col gap-0.5">
              {col.map((cell, ri) =>
                cell ? (
                  <div
                    key={cell.k}
                    title={`${cell.k}: ${cell.count} completion${cell.count === 1 ? '' : 's'}`}
                    className="aspect-square w-full rounded-xs"
                    style={{ backgroundColor: bg(level(cell.count)) }}
                  />
                ) : (
                  <div key={ri} className="aspect-square w-full" />
                ),
              )}
            </div>
          ))}
        </div>
      </div>

      {/* legend */}
      <div className="mt-2 flex items-center justify-end gap-1 text-[10px] text-faint">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className="h-2.5 w-2.5 rounded-xs" style={{ backgroundColor: bg(l) }} />
        ))}
        <span>More</span>
      </div>
    </div>
  )
}
