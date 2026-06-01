import { useState } from 'react'
import { PageTitle, Card, Button, EmptyState } from '../components/ui'
import { useJournalEntries, useAddJournalEntry } from '../hooks/useJournal'

const MOODS = [
  { key: 'great', icon: '😄' },
  { key: 'good', icon: '🙂' },
  { key: 'ok', icon: '😐' },
  { key: 'low', icon: '😔' },
  { key: 'rough', icon: '😣' },
]

const fmt = (d) =>
  new Date(d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })

export default function Journal() {
  const { data: entries = [], isLoading } = useJournalEntries()
  const add = useAddJournalEntry()

  const [content, setContent] = useState('')
  const [mood, setMood] = useState('')

  async function save() {
    await add.mutateAsync({ content: content.trim(), mood })
    setContent('')
    setMood('')
  }

  return (
    <>
      <PageTitle title="Journal" subtitle="Write freely. Your AI companion reflects back." />

      <Card className="mb-6 max-w-2xl">
        <div className="mb-3 flex gap-2">
          {MOODS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMood(mood === m.key ? '' : m.key)}
              title={m.key}
              className={`grid h-9 w-9 place-items-center rounded-lg border text-lg transition-colors ${
                mood === m.key ? 'border-accent bg-accent/10' : 'border-border hover:bg-surface2'
              }`}
            >
              {m.icon}
            </button>
          ))}
        </div>
        <textarea
          className="min-h-32 w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none"
          placeholder="What's on your mind?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        {add.isError && <p className="mt-2 text-sm text-danger">{String(add.error.message || add.error)}</p>}
        <div className="mt-3">
          <Button onClick={save} disabled={!content.trim() || add.isPending}>
            {add.isPending ? 'Reflecting…' : 'Save entry'}
          </Button>
        </div>
      </Card>

      {isLoading ? (
        <p className="text-faint">Loading…</p>
      ) : entries.length === 0 ? (
        <EmptyState icon="✎" title="No entries yet" hint="Your first journal entry will appear here." />
      ) : (
        <div className="max-w-2xl space-y-4">
          {entries.map((e) => (
            <Card key={e.id}>
              <div className="mb-2 flex items-center gap-2 text-xs text-faint">
                <span>{fmt(e.created_at)}</span>
                {e.mood && <span>· {MOODS.find((m) => m.key === e.mood)?.icon} {e.mood}</span>}
              </div>
              <p className="whitespace-pre-wrap text-sm text-fg">{e.content}</p>
              {e.ai_response && (
                <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
                  <p className="mb-1 text-xs text-accent">★ NorthStar</p>
                  <p className="text-sm leading-relaxed text-muted">{e.ai_response}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
