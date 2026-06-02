import { SignedIn, SignedOut } from '@clerk/clerk-react'
import { Navigate, Link } from 'react-router-dom'
import { Button } from '../components/ui'
import { Logo, LogoWord } from '../components/Logo'
import ThemeToggle from '../components/ThemeToggle'

const features = [
  { icon: '◆', title: 'AI Roadmaps', text: 'Describe a goal and your real schedule. AI judges if it fits your time, then maps milestones with buffer built in.' },
  { icon: '☾', title: 'Daily Coach', text: 'Morning intentions, mid-day nudges, evening reflections — all AI-guided and tied to your goals.' },
  { icon: '▦', title: 'Habits & Streaks', text: 'Daily reps with streaks and a contribution heatmap, linked to the goals that matter.' },
  { icon: '📈', title: 'Life Score & Analytics', text: 'One composite score across Personal, Career, and Learning, with trends over time.' },
  { icon: '❧', title: 'Weekly Reviews', text: 'An AI deep-dive every week — what happened, the pattern, three adjustments. Export to PDF.' },
  { icon: '🔄', title: 'Catch-up & Journal', text: 'Slipped? AI re-plans missed milestones into smaller steps. Plus a reflective AI journal.' },
  { icon: '🌱', title: 'Focus Worlds', text: 'Focus timer that grows a living 3D world — a forest with wildlife, or a city with traffic. Day/night sky, sun & moon. Leave early and it withers.' },
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

          <section className="mx-auto grid max-w-5xl gap-5 px-6 pb-10 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-surface p-6">
                <span className="text-2xl text-accent">{f.icon}</span>
                <h3 className="mt-3 font-display text-xl">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </section>

          <p className="mx-auto mb-24 max-w-2xl px-6 text-center text-sm text-faint">
            ⌘K command palette · calendar view · 3D focus worlds · goal templates · markdown notes · check-in reminders · light & dark · works on mobile
          </p>

          <footer className="border-t border-border py-8 text-center text-sm text-faint">
            NorthStar · Built for one, designed for thousands ·{' '}
            <Link to="/signup" className="text-accent hover:underline">Create your account</Link>
          </footer>
        </div>
      </SignedOut>
    </>
  )
}
