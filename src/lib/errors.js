// Turn raw errors into friendly, actionable messages.
export function humanizeError(error) {
  const msg = String(error?.message || error || '')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return "You're offline — check your connection and try again."
  }
  if (/failed to fetch|networkerror|load failed|err_internet|err_network|fetch/i.test(msg)) {
    return "Can't reach the server — check your connection and try again."
  }
  if (/timeout|timed out/i.test(msg)) return 'That took too long. Please try again.'
  if (/\b401\b|unauthor/i.test(msg)) return 'Your session expired — please sign in again.'
  if (/\b429\b|rate.?limit|too many/i.test(msg)) return 'Too many requests — give it a moment, then retry.'
  if (/\b5\d\d\b|service unavailable|temporarily|overloaded/i.test(msg)) {
    return 'The service is having a moment. Please try again shortly.'
  }
  return msg && msg.length < 140 ? msg : 'Something went wrong. Please try again.'
}
