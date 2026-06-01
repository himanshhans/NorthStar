import { useTheme } from '../lib/theme'

const meta = {
  system: { icon: '◐', label: 'Auto' },
  light: { icon: '☀', label: 'Light' },
  dark: { icon: '☾', label: 'Dark' },
}

export default function ThemeToggle({ compact = false }) {
  const pref = useTheme((s) => s.pref)
  const cycle = useTheme((s) => s.cycle)
  const m = meta[pref]

  return (
    <button
      onClick={cycle}
      title={`Theme: ${m.label} (click to change)`}
      className="inline-flex items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-sm text-muted transition-colors hover:bg-surface2 hover:text-fg"
    >
      <span className="text-base leading-none">{m.icon}</span>
      {!compact && <span>{m.label}</span>}
    </button>
  )
}
