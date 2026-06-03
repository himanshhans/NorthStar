import { Link } from 'react-router-dom'

export function PageTitle({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-5 ${className}`}>
      {children}
    </div>
  )
}

const variants = {
  primary: 'bg-accent text-accent-fg hover:brightness-110',
  ghost: 'border border-border text-fg hover:bg-surface2',
  subtle: 'bg-surface2 text-fg hover:bg-border',
}

export function Button({ as = 'button', variant = 'primary', className = '', to, ...props }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`
  if (as === 'link') {
    return <Link to={to} className={cls} {...props} />
  }
  return <button className={cls} {...props} />
}

export function ProgressBar({ value = 0, className = '' }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-surface2 ${className}`}>
      <div
        className="h-full rounded-full bg-linear-to-r from-accent to-hilite transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function EmptyState({ icon = '✦', title, hint, action }) {
  return (
    <Card className="flex flex-col items-center gap-3 py-14 text-center">
      <span className="text-3xl text-faint">{icon}</span>
      <p className="font-display text-lg text-fg">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </Card>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-md bg-surface2 ${className}`} />
}

export function ErrorState({ title = 'Couldn’t load this', onRetry }) {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine
  return (
    <Card className="flex flex-col items-center gap-3 py-12 text-center">
      <span className="text-3xl">⚠️</span>
      <p className="font-display text-lg text-fg">{title}</p>
      <p className="max-w-sm text-sm text-muted">
        {online ? 'The server didn’t respond. Check your connection and try again.' : 'You appear to be offline.'}
      </p>
      {onRetry && <Button onClick={onRetry} className="mt-1">Retry</Button>}
    </Card>
  )
}

export function Placeholder({ title, note }) {
  return (
    <>
      <PageTitle title={title} subtitle="Coming in a later phase." />
      <EmptyState icon="🚧" title="Not built yet" hint={note} />
    </>
  )
}
