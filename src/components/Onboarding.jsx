import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from './Logo'
import { Button } from './ui'
import { useGoals } from '../hooks/useGoals'

const KEY = 'ns-onboarded'

const steps = [
  { icon: '◆', title: 'Set a goal', text: 'Describe it in plain words — AI maps it into milestones.' },
  { icon: '▦', title: 'Build habits', text: 'Tie daily reps to your goals and grow a streak.' },
  { icon: '☾', title: 'Reflect nightly', text: 'A 2-minute check-in; your coach responds honestly.' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { data: goals, isSuccess } = useGoals()
  const [dismissed, setDismissed] = useState(
    () => (typeof localStorage !== 'undefined' && localStorage.getItem(KEY) === '1'),
  )

  // Only for brand-new users: loaded, zero goals, not dismissed.
  if (dismissed || !isSuccess || (goals && goals.length > 0)) return null

  const close = () => {
    localStorage.setItem(KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={close} />
      <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-6 text-center shadow-xl">
        <Logo size={48} className="mx-auto" />
        <h2 className="mt-4 font-display text-2xl font-semibold">Welcome to NorthStar</h2>
        <p className="mt-1 text-sm text-muted">Your AI coach for goals that actually move. Here's the loop:</p>

        <div className="mt-6 space-y-3 text-left">
          {steps.map((s) => (
            <div key={s.title} className="flex items-start gap-3 rounded-lg border border-border bg-bg p-3">
              <span className="text-xl text-accent">{s.icon}</span>
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted">{s.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <Button onClick={() => { close(); navigate('/goals/new') }}>Create my first goal</Button>
          <button onClick={close} className="text-sm text-faint hover:text-muted">I'll explore first</button>
        </div>
      </div>
    </div>
  )
}
