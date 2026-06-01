// Print a weekly review to PDF via a clean popup window (user picks "Save as PDF").
const esc = (s = '') =>
  String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

export function printReview(review) {
  const adjustments = review.score_snapshot?.adjustments || []
  const score = review.score_snapshot?.score
  const week = new Date(review.week_start).toLocaleDateString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric',
  })

  const html = `<!doctype html><html><head><meta charset="utf-8">
  <title>NorthStar — Weekly Review ${esc(week)}</title>
  <style>
    body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a151d;max-width:640px;margin:40px auto;padding:0 24px;line-height:1.6}
    .brand{color:#f43f5e;font-weight:700;letter-spacing:.04em}
    h1{font-size:22px;margin:.2em 0}
    .score{display:inline-block;background:#f43f5e;color:#fff;padding:2px 10px;border-radius:999px;font-size:13px}
    h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#908a9b;margin:24px 0 6px}
    ul{padding-left:18px} li{margin:6px 0}
    .muted{color:#5d5667}
    @media print{body{margin:0}}
  </style></head><body>
    <p class="brand">★ NorthStar</p>
    <h1>Weekly Review</h1>
    <p class="muted">Week of ${esc(week)} ${typeof score === 'number' ? `· <span class="score">Life Score ${score}</span>` : ''}</p>
    ${review.summary ? `<h2>Summary</h2><p>${esc(review.summary)}</p>` : ''}
    ${review.ai_insights ? `<h2>Pattern</h2><p class="muted">${esc(review.ai_insights)}</p>` : ''}
    ${adjustments.length ? `<h2>Adjust next week</h2><ul>${adjustments.map((a) => `<li>${esc(a)}</li>`).join('')}</ul>` : ''}
  </body></html>`

  const w = window.open('', '_blank', 'width=720,height=900')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
}
