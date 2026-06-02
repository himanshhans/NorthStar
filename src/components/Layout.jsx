import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { UserButton } from '@clerk/clerk-react'
import { Logo, LogoWord } from './Logo'
import ThemeToggle from './ThemeToggle'
import Onboarding from './Onboarding'
import CommandPalette from './CommandPalette'
import ReminderManager from './ReminderManager'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '◎' },
  { to: '/goals', label: 'Goals', icon: '◆' },
  { to: '/habits', label: 'Habits', icon: '▦' },
  { to: '/focus', label: 'Focus', icon: '🌱' },
  { to: '/calendar', label: 'Calendar', icon: '▤' },
  { to: '/journal', label: 'Journal', icon: '✎' },
  { to: '/review', label: 'Weekly Review', icon: '❧' },
  { to: '/analytics', label: 'Analytics', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

const checkinNav = [
  { to: '/checkin/morning', label: 'Morning', icon: '☀' },
  { to: '/checkin/midday', label: 'Mid-day', icon: '◐' },
  { to: '/checkin/evening', label: 'Evening', icon: '☾' },
]

function openPalette() {
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))
}

function NavItem({ item, onNavigate }) {
  return (
    <NavLink
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
          isActive ? 'bg-surface2 text-accent' : 'text-muted hover:bg-surface2 hover:text-fg'
        }`
      }
    >
      <span className="w-5 text-center opacity-80">{item.icon}</span>
      {item.label}
    </NavLink>
  )
}

function NavList({ onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {nav.slice(0, 5).map((item) => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}

      <p className="mt-3 px-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-faint">Check-in</p>
      {checkinNav.map((item) => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}

      <p className="mt-3 px-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-faint">Insights</p>
      {nav.slice(5, 8).map((item) => <NavItem key={item.to} item={item} onNavigate={onNavigate} />)}

      <div className="mt-3 border-t border-border pt-3">
        <NavItem item={nav[8]} onNavigate={onNavigate} />
      </div>
    </nav>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  return (
    <div className="flex min-h-screen bg-bg text-fg">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface p-5 md:flex">
        <div className="mb-6"><LogoWord size={26} /></div>
        <button
          onClick={openPalette}
          className="mb-4 flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-faint transition-colors hover:bg-surface2 hover:text-fg"
        >
          <span>Search…</span>
          <kbd className="rounded bg-surface2 px-1.5 py-0.5 text-xs">⌘K</kbd>
        </button>
        <NavList />
        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <ThemeToggle />
          <div className="flex items-center gap-3">
            <UserButton afterSignOutUrl="/" />
            <span className="text-xs text-faint">Your account</span>
          </div>
        </div>
      </aside>

      {/* Mobile drawer + scrim */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-surface p-5">
            <div className="mb-8 flex items-center justify-between">
              <LogoWord size={24} />
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-muted hover:text-fg">✕</button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
            <div className="mt-auto space-y-3 border-t border-border pt-4">
              <ThemeToggle />
              <div className="flex items-center gap-3">
                <UserButton afterSignOutUrl="/" />
                <span className="text-xs text-faint">Your account</span>
              </div>
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="text-xl text-muted hover:text-fg">☰</button>
          <Logo size={24} />
          <div className="flex items-center gap-3">
            <button onClick={openPalette} aria-label="Search" className="text-lg text-muted hover:text-fg">⌕</button>
            <UserButton afterSignOutUrl="/" />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-5 py-8 md:px-10">
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>

      <Onboarding />
      <CommandPalette />
      <ReminderManager />
    </div>
  )
}
