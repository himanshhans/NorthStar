import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageTitle, Card, Button } from '../components/ui'
import { useGenerateMilestones, useCreateGoal } from '../hooks/useGoals'

const categories = ['Personal', 'Career', 'Learning']

const TEMPLATES = [
  { icon: '🏃', label: 'Get fit', category: 'Personal', title: 'Get fit and lose 5 kg', description: 'Build a sustainable workout + nutrition routine over the next 3 months.' },
  { icon: '🗣️', label: 'Learn a language', category: 'Learning', title: 'Reach conversational Spanish', description: 'Go from beginner to holding a 10-minute conversation in 6 months.' },
  { icon: '📚', label: 'Read more', category: 'Personal', title: 'Read 12 books', description: 'Read 12 books over the next 12 months, starting from zero — about one a month.' },
  { icon: '💻', label: 'Learn a skill', category: 'Learning', title: 'Learn data structures & algorithms', description: 'Become job-ready in DSA over 4 months for interviews.' },
  { icon: '🚀', label: 'Career move', category: 'Career', title: 'Land a senior role', description: 'Build the skills, portfolio, and network to get promoted or switch jobs in 6 months.' },
  { icon: '🧘', label: 'Build a habit', category: 'Personal', title: 'Meditate daily', description: 'Establish a consistent daily mindfulness practice over 2 months.' },
]

const input =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'

export default function GoalNew() {
  const navigate = useNavigate()
  const generate = useGenerateMilestones()
  const create = useCreateGoal()

  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    title: '',
    category: 'Personal',
    description: '',
    target_date: '',
    hoursPerDay: '1',
    daysPerWeek: '5',
  })
  const [milestones, setMilestones] = useState([])
  const [feasibility, setFeasibility] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleGenerate() {
    const res = await generate.mutateAsync({
      title: form.title,
      category: form.category,
      description: form.description,
      target_date: form.target_date || undefined,
      hoursPerDay: Number(form.hoursPerDay) || undefined,
      daysPerWeek: Number(form.daysPerWeek) || undefined,
    })
    setMilestones(res.milestones)
    setFeasibility(res.feasibility)
    setStep(2)
  }

  function editMilestone(i, key, value) {
    setMilestones((list) => list.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)))
  }
  function removeMilestone(i) {
    setMilestones((list) => list.filter((_, idx) => idx !== i))
  }
  function addMilestone() {
    setMilestones((list) => [...list, { title: '', description: '', due_date: '' }])
  }

  async function handleSave() {
    const goal = {
      title: form.title,
      category: form.category,
      description: form.description || null,
      target_date: form.target_date || null,
      commitment: {
        hoursPerDay: Number(form.hoursPerDay) || null,
        daysPerWeek: Number(form.daysPerWeek) || null,
      },
    }
    const created = await create.mutateAsync({ goal, milestones })
    navigate(`/goals/${created.id}`)
  }

  return (
    <>
      <PageTitle
        title="New goal"
        subtitle={step === 1 ? 'Describe it. AI breaks it down.' : 'Review your milestones, then save.'}
      />

      {step === 1 && (
        <Card className="max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-muted">Start from a template (optional)</label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.label}
                    onClick={() => setForm((f) => ({ ...f, title: t.title, category: t.category, description: t.description }))}
                    className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-fg"
                  >
                    {t.icon} {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm text-muted">Goal title</label>
              <input
                className={input}
                placeholder="e.g. Become a data scientist"
                value={form.title}
                onChange={set('title')}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-muted">Category</label>
                <select className={input} value={form.category} onChange={set('category')}>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">Target date</label>
                <input type="date" className={input} value={form.target_date} onChange={set('target_date')} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm text-muted">Hours per day</label>
                <input
                  type="number" min="0.5" step="0.5"
                  className={input}
                  value={form.hoursPerDay}
                  onChange={set('hoursPerDay')}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-muted">Days per week</label>
                <input
                  type="number" min="1" max="7" step="1"
                  className={input}
                  value={form.daysPerWeek}
                  onChange={set('daysPerWeek')}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-faint">
              How much time you'll realistically commit — the AI checks if your goal fits and paces around it (with buffer days).
            </p>

            <div>
              <label className="mb-1 block text-sm text-muted">Description</label>
              <textarea
                className={`${input} min-h-24`}
                placeholder="Why this matters, where you're starting from, any constraints…"
                value={form.description}
                onChange={set('description')}
              />
            </div>

            {generate.isError && (
              <p className="text-sm text-danger">{String(generate.error.message || generate.error)}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleGenerate} disabled={!form.title.trim() || generate.isPending}>
                {generate.isPending ? 'Generating…' : '✦ Generate milestones'}
              </Button>
              <Button
                variant="ghost"
                onClick={() => { setMilestones([]); setStep(2) }}
                disabled={!form.title.trim()}
              >
                Skip — add manually
              </Button>
            </div>
          </div>
        </Card>
      )}

      {step === 2 && (
        <div className="max-w-2xl space-y-4">
          {feasibility && <FeasibilityBanner f={feasibility} />}
          {milestones.map((m, i) => (
            <Card key={i}>
              <div className="flex items-start gap-3">
                <span className="mt-2 font-display text-accent">{i + 1}</span>
                <div className="flex-1 space-y-2">
                  <input
                    className={input}
                    placeholder="Milestone title"
                    value={m.title}
                    onChange={(e) => editMilestone(i, 'title', e.target.value)}
                  />
                  <textarea
                    className={`${input} min-h-16`}
                    placeholder="Description"
                    value={m.description}
                    onChange={(e) => editMilestone(i, 'description', e.target.value)}
                  />
                  <input
                    type="date"
                    className={input}
                    value={m.due_date || ''}
                    onChange={(e) => editMilestone(i, 'due_date', e.target.value)}
                  />
                </div>
                <button
                  onClick={() => removeMilestone(i)}
                  className="text-faint hover:text-danger"
                  title="Remove"
                >
                  ✕
                </button>
              </div>
            </Card>
          ))}

          <Button variant="subtle" onClick={addMilestone}>+ Add milestone</Button>

          {create.isError && (
            <p className="text-sm text-danger">{String(create.error.message || create.error)}</p>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="ghost" onClick={() => setStep(1)}>← Back</Button>
            <Button onClick={handleSave} disabled={!form.title.trim() || create.isPending}>
              {create.isPending ? 'Saving…' : 'Save goal'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

const VERDICT = {
  achievable: { icon: '✅', label: 'Achievable', cls: 'border-success/40 bg-success/5 text-success' },
  tight: { icon: '⚠️', label: 'Tight', cls: 'border-accent/40 bg-accent/5 text-accent' },
  unrealistic: { icon: '🛑', label: 'Unrealistic', cls: 'border-danger/40 bg-danger/5 text-danger' },
}

function FeasibilityBanner({ f }) {
  const v = VERDICT[f.verdict] || VERDICT.achievable
  return (
    <div className={`rounded-xl border p-4 ${v.cls}`}>
      <p className="flex items-center gap-2 text-sm font-medium">
        {v.icon} {v.label}
      </p>
      {f.note && <p className="mt-1 text-sm text-fg">{f.note}</p>}
    </div>
  )
}
