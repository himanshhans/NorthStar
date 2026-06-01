import { useState } from 'react'
import { PageTitle, Card, Button } from '../components/ui'
import { useGoals } from '../hooks/useGoals'
import { useTodayCheckin, useSubmitReflection } from '../hooks/useCheckins'

const input =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'

const prompts = [
  { key: 'went_well', label: 'What went well today?', ph: 'Wins, progress, moments you showed up…' },
  { key: 'didnt_go', label: "What didn't go as planned?", ph: 'Slips, blockers, things you avoided…' },
  { key: 'tomorrow', label: 'One thing to improve tomorrow?', ph: 'A single, concrete adjustment…' },
  { key: 'free', label: 'Anything else? (optional)', ph: 'Free-write whatever is on your mind…' },
]

export default function CheckinEvening() {
  const { data: goals = [] } = useGoals({ status: 'Active' })
  const { data: existing, isLoading } = useTodayCheckin('evening')
  const submit = useSubmitReflection()

  const [content, setContent] = useState({ went_well: '', didnt_go: '', tomorrow: '', free: '' })
  const [showForm, setShowForm] = useState(false)

  const set = (k) => (e) => setContent((c) => ({ ...c, [k]: e.target.value }))
  const filled = content.went_well || content.didnt_go || content.tomorrow || content.free

  async function handleSubmit() {
    await submit.mutateAsync({ content, goals: goals.map((g) => g.title) })
    setShowForm(false)
    setContent({ went_well: '', didnt_go: '', tomorrow: '', free: '' })
  }

  const done = existing && !showForm

  return (
    <>
      <PageTitle
        title="Evening reflection"
        subtitle="Close the day honestly. Your coach reads it and responds."
        action={
          done ? <Button variant="ghost" onClick={() => setShowForm(true)}>Reflect again</Button> : null
        }
      />

      {isLoading ? (
        <p className="text-faint">Loading…</p>
      ) : done ? (
        <div className="max-w-2xl space-y-5">
          <Card>
            <p className="mb-3 text-sm text-muted">Tonight's reflection</p>
            <ReflectionReadout content={existing.content} />
          </Card>
          {existing.ai_response && (
            <Card className="border-accent/30 bg-accent/5">
              <p className="mb-2 flex items-center gap-2 text-sm text-accent">★ NorthStar says</p>
              <p className="leading-relaxed text-fg">{existing.ai_response}</p>
            </Card>
          )}
        </div>
      ) : (
        <div className="max-w-2xl space-y-4">
          {prompts.map((p) => (
            <div key={p.key}>
              <label className="mb-1 block text-sm text-muted">{p.label}</label>
              <textarea
                className={`${input} min-h-20`}
                placeholder={p.ph}
                value={content[p.key]}
                onChange={set(p.key)}
              />
            </div>
          ))}

          {submit.isError && (
            <p className="text-sm text-danger">{String(submit.error.message || submit.error)}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button onClick={handleSubmit} disabled={!filled || submit.isPending}>
              {submit.isPending ? 'Reflecting…' : 'Submit reflection'}
            </Button>
            {showForm && (
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            )}
          </div>
          <p className="text-xs text-faint">
            Your coach sees your {goals.length} active goal{goals.length === 1 ? '' : 's'} for context.
          </p>
        </div>
      )}
    </>
  )
}

function ReflectionReadout({ content }) {
  const rows = [
    ['Went well', content?.went_well],
    ["Didn't go as planned", content?.didnt_go],
    ['Improve tomorrow', content?.tomorrow],
    ['Notes', content?.free],
  ].filter(([, v]) => v)
  return (
    <div className="space-y-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs uppercase tracking-wide text-faint">{label}</p>
          <p className="text-sm text-fg">{value}</p>
        </div>
      ))}
    </div>
  )
}
