// Local-calendar date helpers. The app keys all "today" rows by the user's
// LOCAL date, not UTC — otherwise users east/west of UTC see "today" flip at
// the wrong hour (e.g. IST users stuck on yesterday until 5:30am).

// YYYY-MM-DD in the user's local timezone.
export const localDay = (d = new Date()) => {
  const x = new Date(d)
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset())
  return x.toISOString().slice(0, 10)
}

export const todayStr = () => localDay()

export const yesterdayStr = () => daysAgoStr(1)

export const daysAgoStr = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return localDay(d)
}

// 'morning' | 'afternoon' | 'evening' | 'night' from local hour.
export const phaseOf = (h = new Date().getHours()) => {
  if (h < 5) return 'night'
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  if (h < 21) return 'evening'
  return 'night'
}
