import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PageTitle, Card, Button } from '../components/ui'
import { useGoals } from '../hooks/useGoals'
import { useTodayCheckin, useSubmitCheckin } from '../hooks/useCheckins'

const input =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'

const emptyTask = () => ({ text: '', goalId: '' })

export default function CheckinMorning() {
  const { data: goals = [] } = useGoals({ status: 'Active' })
  const { data: existing, isLoading } = useTodayCheckin('morning')
  const submit = useSubmitCheckin('morning')

  const [tasks, setTasks] = useState([emptyTask()])
  const [redo, setRedo] = useState(false)

  const setTask = (i, key, v) =>
    setTasks((arr) => arr.map((t, idx) => (idx === i ? { ...t, [key]: v } : t)))
  const addTask = () => setTasks((arr) => (arr.length < 3 ? [...arr, emptyTask()] : arr))
  const removeTask = (i) => setTasks((arr) => arr.filter((_, idx) => idx !== i))

  const valid = tasks.some((t) => t.text.trim())

  async function handleSubmit() {
    const clean = tasks.filter((t) => t.text.trim()).map((t) => ({ text: t.text.trim(), goalId: t.goalId || null }))
    await submit.mutateAsync({ tasks: clean })
    setRedo(false)
  }

  const done = existing && !redo

  return (
    <>
      <PageTitle
        title="Morning intention"
        subtitle="Pick 1–3 things that move your goals today."
        action={done ? <Button variant="ghost" onClick={() => setRedo(true)}>Set again</Button> : null}
      />

      {isLoading ? (
        <p className="text-faint">Loading…</p>
      ) : done ? (
        <Card className="max-w-2xl">
          <p className="mb-3 text-sm text-muted">Today's focus</p>
          <ul className="space-y-2">
            {(existing.content?.tasks || []).map((t, i) => {
              const g = goals.find((x) => x.id === t.goalId)
              return (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-accent">◆</span>
                  <span>{t.text}</span>
                  {g && <span className="text-xs text-faint">· {g.title}</span>}
                </li>
              )
            })}
          </ul>
        </Card>
      ) : (
        <div className="max-w-2xl space-y-4">
          {tasks.map((t, i) => (
            <Card key={i}>
              <div className="flex items-start gap-3">
                <span className="mt-2 font-display text-accent">{i + 1}</span>
                <div className="flex-1 space-y-2">
                  <input
                    className={input}
                    placeholder="What will you do today?"
                    value={t.text}
                    onChange={(e) => setTask(i, 'text', e.target.value)}
                  />
                  <select className={input} value={t.goalId} onChange={(e) => setTask(i, 'goalId', e.target.value)}>
                    <option value="">Link to goal (optional)</option>
                    {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                  </select>
                </div>
                {tasks.length > 1 && (
                  <button onClick={() => removeTask(i)} className="text-faint hover:text-danger">✕</button>
                )}
              </div>
            </Card>
          ))}

          {tasks.length < 3 && (
            <Button variant="subtle" onClick={addTask}>+ Add task</Button>
          )}

          {submit.isError && <p className="text-sm text-danger">{String(submit.error.message || submit.error)}</p>}

          <div className="flex gap-3 pt-1">
            <Button onClick={handleSubmit} disabled={!valid || submit.isPending}>
              {submit.isPending ? 'Saving…' : 'Set intentions'}
            </Button>
            {redo && <Button variant="ghost" onClick={() => setRedo(false)}>Cancel</Button>}
          </div>
          {goals.length === 0 && (
            <p className="text-xs text-faint">
              No active goals yet — <Link to="/goals/new" className="text-accent">create one</Link> to link tasks.
            </p>
          )}
        </div>
      )}
    </>
  )
}
