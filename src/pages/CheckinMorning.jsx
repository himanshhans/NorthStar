import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { PageTitle, Card, Button } from '../components/ui'
import { useGoals } from '../hooks/useGoals'
import {
  useTodayCheckin, useSubmitCheckin, useMorningChat, useYesterdayEvening,
} from '../hooks/useCheckins'

const input =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'
const todayStr = () => new Date().toISOString().slice(0, 10)

export default function CheckinMorning() {
  const { user } = useUser()
  const name = user?.firstName || 'there'
  const { data: goals = [] } = useGoals({ status: 'Active' })
  const { data: yesterday } = useYesterdayEvening()
  const { data: existing, isLoading } = useTodayCheckin('morning')
  const chat = useMorningChat()
  const submit = useSubmitCheckin('morning')

  const [convo, setConvo] = useState([]) // {role:'assistant'|'user', content}
  const [tasks, setTasks] = useState([]) // {text, goalId}
  const [draft, setDraft] = useState('')
  const [redo, setRedo] = useState(false)
  const [busy, setBusy] = useState(false)
  const opened = useRef(false)
  const scrollRef = useRef(null)

  const done = existing && !redo

  const mapTasks = (suggested) =>
    suggested.map((t) => ({
      text: t.text,
      goalId: goals.find((g) => g.title === t.goal)?.id || '',
    }))

  // opener (hybrid: greet + suggest tasks immediately) — fire once
  useEffect(() => {
    if (done || isLoading || opened.current) return
    opened.current = true
    ;(async () => {
      setBusy(true)
      try {
        const r = await chat.mutateAsync({ name, today: todayStr(), goals: goalsForFn(goals), yesterday, messages: [] })
        setConvo([{ role: 'assistant', content: r.reply }])
        if (r.tasks.length) setTasks(mapTasks(r.tasks))
      } catch {
        setConvo([{ role: 'assistant', content: `Morning, ${name}! What would make today a win?` }])
      } finally {
        setBusy(false)
      }
    })()
  }, [done, isLoading]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [convo, busy])

  async function send() {
    const text = draft.trim()
    if (!text || busy) return
    const next = [...convo, { role: 'user', content: text }]
    setConvo(next)
    setDraft('')
    setBusy(true)
    try {
      const r = await chat.mutateAsync({ name, today: todayStr(), goals: goalsForFn(goals), yesterday, messages: next })
      setConvo([...next, { role: 'assistant', content: r.reply }])
      if (r.tasks.length) setTasks(mapTasks(r.tasks))
    } catch (e) {
      setConvo([...next, { role: 'assistant', content: `(hmm, I glitched — ${String(e.message || e)}) You can still set your tasks below.` }])
    } finally {
      setBusy(false)
    }
  }

  const setTask = (i, k, v) => setTasks((arr) => arr.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)))
  const addTask = () => setTasks((arr) => (arr.length < 3 ? [...arr, { text: '', goalId: '' }] : arr))
  const removeTask = (i) => setTasks((arr) => arr.filter((_, idx) => idx !== i))
  const valid = tasks.some((t) => t.text.trim())

  async function saveFocus() {
    const clean = tasks.filter((t) => t.text.trim()).map((t) => ({ text: t.text.trim(), goalId: t.goalId || null }))
    await submit.mutateAsync({ tasks: clean })
    setRedo(false)
  }

  return (
    <>
      <PageTitle
        title="Morning intention"
        subtitle="A quick chat to set today's focus."
        action={done ? <Button variant="ghost" onClick={() => { setRedo(true); opened.current = false; setConvo([]); setTasks([]) }}>Chat again</Button> : null}
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
        <div className="grid gap-5 md:grid-cols-2">
          {/* chat */}
          <Card className="flex h-96 flex-col">
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto pr-1">
              {convo.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === 'user' ? 'bg-accent text-accent-fg' : 'bg-surface2 text-fg'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {busy && <div className="text-xs text-faint">typing…</div>}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                className={input}
                placeholder="Reply…"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
              />
              <Button onClick={send} disabled={!draft.trim() || busy}>Send</Button>
            </div>
          </Card>

          {/* today's focus (editable, AI-suggested) */}
          <Card className="flex flex-col">
            <p className="mb-3 text-sm text-muted">Today's focus {tasks.length > 0 && <span className="text-faint">· suggested</span>}</p>
            <div className="flex-1 space-y-3">
              {tasks.length === 0 && <p className="text-sm text-faint">Your friend will suggest 1–3 tasks — or add your own.</p>}
              {tasks.map((t, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border bg-bg p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-accent">◆</span>
                    <input
                      className="min-w-0 flex-1 bg-transparent text-sm text-fg placeholder:text-faint focus:outline-none"
                      placeholder="Focus task"
                      value={t.text}
                      onChange={(e) => setTask(i, 'text', e.target.value)}
                    />
                    <button onClick={() => removeTask(i)} className="shrink-0 text-faint hover:text-danger">✕</button>
                  </div>
                  {goals.length > 0 && (
                    <select
                      className="w-full rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted focus:border-accent focus:outline-none"
                      value={t.goalId}
                      onChange={(e) => setTask(i, 'goalId', e.target.value)}
                    >
                      <option value="">Link to goal (optional)</option>
                      {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  )}
                </div>
              ))}
              {tasks.length < 3 && <Button variant="subtle" onClick={addTask}>+ Add task</Button>}
            </div>
            {submit.isError && <p className="mt-2 text-sm text-danger">{String(submit.error.message || submit.error)}</p>}
            <Button className="mt-3" onClick={saveFocus} disabled={!valid || submit.isPending}>
              {submit.isPending ? 'Saving…' : 'Set as today’s focus'}
            </Button>
            {goals.length === 0 && (
              <p className="mt-2 text-xs text-faint">No active goals — <Link to="/goals/new" className="text-accent">create one</Link> to link tasks.</p>
            )}
          </Card>
        </div>
      )}
    </>
  )
}

const goalsForFn = (goals) => goals.map((g) => ({ id: g.id, title: g.title, category: g.category }))
