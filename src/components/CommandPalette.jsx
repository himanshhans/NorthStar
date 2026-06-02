import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGoals } from '../hooks/useGoals'
import { useHabits } from '../hooks/useHabits'
import { useJournalEntries } from '../hooks/useJournal'
import { useTheme } from '../lib/theme'

const STATIC = [
  { id: 'new-goal', label: 'New goal', hint: 'Create', icon: '◆', to: '/goals/new', kw: 'add create goal' },
  { id: 'goals', label: 'Goals', hint: 'Go to', icon: '◆', to: '/goals', kw: 'goals list' },
  { id: 'habits', label: 'Habits', hint: 'Go to', icon: '▦', to: '/habits', kw: 'habits streak' },
  { id: 'morning', label: 'Morning intention', hint: 'Check-in', icon: '☀', to: '/checkin/morning', kw: 'focus tasks morning' },
  { id: 'midday', label: 'Mid-day nudge', hint: 'Check-in', icon: '◐', to: '/checkin/midday', kw: 'pulse midday' },
  { id: 'evening', label: 'Evening reflection', hint: 'Check-in', icon: '☾', to: '/checkin/evening', kw: 'reflect evening journal' },
  { id: 'journal', label: 'Journal', hint: 'Go to', icon: '✎', to: '/journal', kw: 'journal write notes' },
  { id: 'calendar', label: 'Calendar', hint: 'Go to', icon: '▤', to: '/calendar', kw: 'calendar month schedule' },
  { id: 'review', label: 'Weekly review', hint: 'Go to', icon: '❧', to: '/review', kw: 'weekly review summary' },
  { id: 'analytics', label: 'Analytics', hint: 'Go to', icon: '📈', to: '/analytics', kw: 'charts trends analytics' },
  { id: 'dashboard', label: 'Dashboard', hint: 'Go to', icon: '◎', to: '/dashboard', kw: 'home dashboard' },
  { id: 'settings', label: 'Settings', hint: 'Go to', icon: '⚙', to: '/settings', kw: 'settings account' },
]

export default function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const cycleTheme = useTheme((s) => s.cycle)

  const { data: goals = [] } = useGoals()
  const { data: habits = [] } = useHabits()
  const { data: journal = [] } = useJournalEntries()

  // Open on ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQ('')
      setSel(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])

  const items = useMemo(() => {
    const term = q.trim().toLowerCase()
    const actions = [
      { id: 'theme', label: 'Toggle theme', hint: 'Action', icon: '◐', run: cycleTheme, kw: 'theme dark light' },
      ...STATIC,
    ]
    const goalItems = goals.map((g) => ({
      id: `g-${g.id}`, label: g.title, hint: `Goal · ${g.category}`, icon: '◆', to: `/goals/${g.id}`, kw: g.title.toLowerCase(),
    }))
    const habitItems = habits.map((h) => ({
      id: `h-${h.id}`, label: h.title, hint: 'Habit', icon: '▦', to: '/habits', kw: h.title.toLowerCase(),
    }))
    // Journal entries: only surface when actively searching (keeps default list clean).
    const journalItems = term
      ? journal
          .filter((e) => e.content?.toLowerCase().includes(term))
          .slice(0, 5)
          .map((e) => ({
            id: `j-${e.id}`,
            label: e.content.slice(0, 60) + (e.content.length > 60 ? '…' : ''),
            hint: 'Journal',
            icon: '✎',
            to: '/journal',
            kw: e.content.toLowerCase(),
          }))
      : []
    const all = [...actions, ...goalItems, ...habitItems, ...journalItems]
    if (!term) return all.slice(0, 9)
    return all
      .filter((it) => it.label.toLowerCase().includes(term) || it.kw?.includes(term))
      .slice(0, 12)
  }, [q, goals, habits, journal, cycleTheme])

  useEffect(() => { setSel(0) }, [q])

  if (!open) return null

  const choose = (it) => {
    setOpen(false)
    if (it.run) it.run()
    else if (it.to) navigate(it.to)
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(s + 1, items.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); items[sel] && choose(items[sel]) }
  }

  return (
    <div className="fixed inset-0 z-60 flex items-start justify-center px-4 pt-24">
      <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search or jump to…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-fg placeholder:text-faint focus:outline-none"
        />
        <ul className="max-h-80 overflow-y-auto p-2">
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-faint">No matches</li>}
          {items.map((it, i) => (
            <li key={it.id}>
              <button
                onMouseEnter={() => setSel(i)}
                onClick={() => choose(it)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                  i === sel ? 'bg-surface2 text-fg' : 'text-muted'
                }`}
              >
                <span className="w-5 text-center text-accent">{it.icon}</span>
                <span className="flex-1 truncate">{it.label}</span>
                <span className="text-xs text-faint">{it.hint}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className="border-t border-border px-3 py-2 text-xs text-faint">
          ↑↓ navigate · ↵ select · esc close
        </div>
      </div>
    </div>
  )
}
