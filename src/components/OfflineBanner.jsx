import { useEffect, useRef, useState } from 'react'
import { toast } from '../lib/toast'

// Top banner shown while the browser reports no connection.
export default function OfflineBanner() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  const wasOffline = useRef(false)

  useEffect(() => {
    const on = () => {
      setOnline(true)
      if (wasOffline.current) {
        wasOffline.current = false
        toast('Back online — syncing your data.', 'success')
      }
    }
    const off = () => { wasOffline.current = true; setOnline(false) }
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (online) return null
  return (
    <div className="fixed inset-x-0 top-0 z-95 bg-danger px-4 py-1.5 text-center text-sm font-medium text-white">
      You're offline — changes won't save until you reconnect.
    </div>
  )
}
