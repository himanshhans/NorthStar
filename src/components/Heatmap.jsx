// GitHub-style contribution heatmap.
// `counts`: object mapping 'YYYY-MM-DD' -> number (intensity).
const DAY_MS = 86400000
const fmt = (d) => d.toISOString().slice(0, 10)

function level(count, max) {
  if (!count) return 0
  if (max <= 1) return 4
  const r = count / max
  if (r > 0.75) return 4
  if (r > 0.5) return 3
  if (r > 0.25) return 2
  return 1
}

const cellStyle = (lvl) => ({
  backgroundColor:
    lvl === 0
      ? 'var(--color-surface2)'
      : `color-mix(in srgb, var(--color-accent) ${[0, 25, 45, 70, 100][lvl]}%, transparent)`,
})

export default function Heatmap({ counts = {}, weeks = 17 }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  // start = `weeks` back, snapped to the prior Sunday
  const start = new Date(today.getTime() - (weeks * 7 - 1) * DAY_MS)
  start.setDate(start.getDate() - start.getDay())

  const max = Math.max(1, ...Object.values(counts))
  const cols = []
  let cursor = new Date(start)
  while (cursor <= today) {
    const col = []
    for (let i = 0; i < 7; i++) {
      if (cursor <= today) {
        const key = fmt(cursor)
        col.push({ key, count: counts[key] || 0 })
      } else {
        col.push(null)
      }
      cursor = new Date(cursor.getTime() + DAY_MS)
    }
    cols.push(col)
  }

  return (
    <div className="flex gap-1 overflow-x-auto pb-1">
      {cols.map((col, ci) => (
        <div key={ci} className="flex flex-col gap-1">
          {col.map((cell, ri) =>
            cell ? (
              <div
                key={cell.key}
                title={`${cell.key}: ${cell.count}`}
                className="h-3 w-3 rounded-sm"
                style={cellStyle(level(cell.count, max))}
              />
            ) : (
              <div key={ri} className="h-3 w-3" />
            ),
          )}
        </div>
      ))}
    </div>
  )
}
