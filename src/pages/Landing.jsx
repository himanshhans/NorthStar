import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate, Link } from 'react-router-dom'
import { Button } from '../components/ui'
import { Logo, LogoWord } from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

const features = [
  { icon: '◆', title: 'Goal Engine', text: 'Describe a goal in plain words. AI breaks it into milestones with deadlines.' },
  { icon: '☾', title: 'Daily Coach', text: 'Morning intentions, mid-day nudges, evening reflections — all AI-guided.' },
  { icon: '▦', title: 'Habit Tracker', text: 'Streaks, heatmaps, and habits tied to the goals that matter.' },
  { icon: '📈', title: 'Life Score', text: 'One composite score across Personal, Career, and Learning — trending daily.' },
]

export default function Landing() {
  return (
    <>
      <SignedIn>
        <Navigate to="/dashboard" replace />
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen bg-bg text-fg">
          <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
            <LogoWord size={28} />
            <div className="flex items-center gap-3">
              <ThemeToggle compact />
              <Button as="link" to="/login" variant="ghost">Log in</Button>
              <Button as="link" to="/signup">Get started</Button>
            </div>
          </header>

          <section className="mx-auto max-w-3xl px-6 py-24 text-center">
            <Logo size={64} className="mx-auto mb-6" />
            <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
              Your personal AI growth coach
            </p>
            <h1 className="font-display text-5xl font-semibold leading-tight md:text-6xl">
              You tell it where you want to go.
              <span className="bg-linear-to-r from-accent to-hilite bg-clip-text text-transparent"> It gets you there.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
              NorthStar turns big goals into a daily system — milestones, habits, reflections,
              and an AI that re-plans when life gets in the way.
            </p>
            <div className="mt-10 flex justify-center gap-4">
              <Button as="link" to="/signup" className="px-6 py-3 text-base">Start free</Button>
              <Button as="link" to="/login" variant="ghost" className="px-6 py-3 text-base">I have an account</Button>
            </div>
          </section>

          <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-28 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-surface p-6">
                <span className="text-2xl text-accent">{f.icon}</span>
                <h3 className="mt-3 font-display text-xl">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </section>

          <footer className="border-t border-border py-8 text-center text-sm text-faint">
            NorthStar · Built for one, designed for thousands ·{' '}
            <Link to="/signup" className="text-accent hover:underline">Create your account</Link>
          </footer>
        </div>
      </SignedOut>
    </>
  )
}
