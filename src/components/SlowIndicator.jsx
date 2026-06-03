import { useEffect, useState } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'

// Shows a subtle "still working" pill when a request hangs on a slow connection.
export default function SlowIndicator() {
  const active = useIsFetching() + useIsMutating() > 0
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    if (!active) { setSlow(false); return }
    const id = setTimeout(() => setSlow(true), 4000)
    return () => clearTimeout(id)
  }, [active])

  if (!slow) return null
  return (
    <div className="fixed bottom-4 left-4 z-[85] flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted shadow-lg">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      Still working… slow connection
    </div>
  )
}
