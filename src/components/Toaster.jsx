import { useToasts } from '../lib/toast'

export default function Toaster() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  if (!toasts.length) return null
  return (
    <div className="fixed bottom-4 right-4 z-[90] flex w-full max-w-xs flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-2 rounded-lg border bg-surface px-3 py-2 text-sm text-fg shadow-xl ${
            t.type === 'error' ? 'border-danger/40' : t.type === 'success' ? 'border-success/40' : 'border-border'
          }`}
        >
          <span className={t.type === 'error' ? 'text-danger' : t.type === 'success' ? 'text-success' : 'text-accent'}>
            {t.type === 'error' ? '⚠' : t.type === 'success' ? '✓' : 'ⓘ'}
          </span>
          <span className="flex-1">{t.message}</span>
          <button onClick={() => dismiss(t.id)} className="shrink-0 text-faint hover:text-fg" aria-label="Dismiss">✕</button>
        </div>
      ))}
    </div>
  )
}
