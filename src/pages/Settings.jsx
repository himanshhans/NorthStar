import { UserProfile } from '@clerk/clerk-react'
import { PageTitle, Card, Button } from '../components/ui'
import { useReminders, SLOTS, notificationPermission } from '../lib/reminders'

export default function Settings() {
  const prefs = useReminders((s) => s.prefs)
  const save = useReminders((s) => s.save)
  const requestPermission = useReminders((s) => s.requestPermission)
  const perm = notificationPermission()

  async function enable() {
    const res = await requestPermission()
    if (res === 'granted') save({ enabled: true })
  }

  return (
    <>
      <PageTitle title="Settings" subtitle="Reminders, profile, and account." />

      <Card className="mb-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Check-in reminders</p>
            <p className="text-sm text-muted">Browser notifications at your check-in times (while the app is open).</p>
          </div>
          {perm === 'unsupported' ? (
            <span className="text-xs text-faint">Not supported</span>
          ) : prefs.enabled && perm === 'granted' ? (
            <Button variant="ghost" onClick={() => save({ enabled: false })}>Disable</Button>
          ) : (
            <Button onClick={enable}>Enable</Button>
          )}
        </div>

        {perm === 'denied' && (
          <p className="mt-3 text-sm text-danger">
            Notifications are blocked in your browser. Allow them in site settings, then enable here.
          </p>
        )}

        {prefs.enabled && perm === 'granted' && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {SLOTS.map((s) => (
              <label key={s.key} className="flex items-center justify-between text-sm">
                <span>{s.label} <span className="text-faint">· {s.hour}:00</span></span>
                <input
                  type="checkbox"
                  checked={prefs[s.key]}
                  onChange={(e) => save({ [s.key]: e.target.checked })}
                  className="h-4 w-4 accent-accent"
                />
              </label>
            ))}
          </div>
        )}
      </Card>

      <UserProfile routing="hash" />
    </>
  )
}
