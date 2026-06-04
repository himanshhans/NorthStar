import { useEffect, useRef, useState } from 'react'
import { PageTitle, Card, Button } from '../components/ui'
import { FocusScene, CollectionScene, isBuilding } from '../components/three/FocusWorld'
import { useFocusSessions, useSaveFocusSession, gardenStats, elementEmoji, pickElement, SPECIAL_MIN } from '../hooks/useFocus'

const PRESETS = [25, 50, 90]
const MIN_MIN = 25
const clampMin = (v) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(180, Math.max(MIN_MIN, n)) : MIN_MIN
}
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const input =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-fg placeholder:text-faint focus:border-accent focus:outline-none'

export default function Focus() {
  const { data: sessions = [] } = useFocusSessions()
  const save = useSaveFocusSession()
  const stats = gardenStats(sessions)

  const [phase, setPhase] = useState('idle') // idle | running | done | failed
  const [durationMin, setDurationMin] = useState(25)
  const [task, setTask] = useState('')
  const [strict, setStrict] = useState(false)
  const [mode, setMode] = useState(() => localStorage.getItem('ns-focus-mode') || 'garden') // garden | city
  const [view, setView] = useState(mode)
  const [element, setElement] = useState('tree')
  const [seed, setSeed] = useState('preview')
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(0)
  const failRef = useRef(() => {})

  const durationSec = durationMin * 60
  const progress = phase === 'done' ? 1 : Math.min(1, elapsed / durationSec)
  const remaining = Math.max(0, Math.ceil(durationSec - elapsed))

  const isCity = mode === 'city'
  const special = isCity
    ? { emoji: '🗼', verb: 'build a world landmark (Eiffel, Big Ben, Burj…)' }
    : { emoji: '🌸', verb: 'grow a rare Sakura or four-leaf Clover' }
  const plantCount = stats.completed.filter((s) => !isBuilding(s.element)).length
  const cityCount = stats.completed.filter((s) => isBuilding(s.element)).length
  const viewCount = view === 'city' ? cityCount : plantCount

  const chooseMode = (m) => { setMode(m); setView(m); localStorage.setItem('ns-focus-mode', m) }

  function start() {
    setElement(pickElement(mode, durationMin))
    setSeed(Math.random().toString(36).slice(2))
    setElapsed(0)
    startRef.current = Date.now()
    setPhase('running')
  }
  function complete() {
    save.mutate({ element, duration_sec: durationSec, focused_sec: durationSec, completed: true, task: task || null })
    setPhase('done')
  }
  function fail() {
    const f = Math.floor((Date.now() - startRef.current) / 1000)
    save.mutate({ element, duration_sec: durationSec, focused_sec: f, completed: false, task: task || null })
    setPhase('failed')
  }
  failRef.current = fail

  // running loop + strict tab-guard
  useEffect(() => {
    if (phase !== 'running') return
    const id = setInterval(() => {
      const e = (Date.now() - startRef.current) / 1000
      setElapsed(e)
      if (e >= durationSec) { clearInterval(id); complete() }
    }, 250)

    let onVis, onBlur
    if (strict) {
      onVis = () => { if (document.hidden) failRef.current() }
      onBlur = () => failRef.current()
      document.addEventListener('visibilitychange', onVis)
      window.addEventListener('blur', onBlur)
    }
    return () => {
      clearInterval(id)
      if (strict) {
        document.removeEventListener('visibilitychange', onVis)
        window.removeEventListener('blur', onBlur)
      }
    }
  }, [phase]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageTitle
        title="Focus"
        subtitle="Pick a length, focus on one task, and grow something. Leave early and it dies."
      />

      {/* stats */}
      <div className="mb-6 flex flex-wrap gap-3 text-sm">
        <Stat label="Today" value={`${stats.todayMin} min`} />
        <Stat label="Grown" value={stats.grown} />
        <Stat label="Lifetime" value={`${stats.totalMin} min`} />
      </div>

      <Card className="mb-8 flex flex-col items-center gap-6 py-10">
        {phase === 'idle' && (
          <div className="w-full max-w-md space-y-5 text-center">
            <FocusScene type={isCity ? 'tower' : 'tree'} progress={0.6} dead={false} seed="preview" world={mode} />

            <div className="inline-flex rounded-lg border border-border p-0.5 text-sm">
              <button
                onClick={() => chooseMode('garden')}
                className={`rounded-md px-4 py-1.5 ${!isCity ? 'bg-accent text-accent-fg' : 'text-muted'}`}
              >🌳 Forest</button>
              <button
                onClick={() => chooseMode('city')}
                className={`rounded-md px-4 py-1.5 ${isCity ? 'bg-accent text-accent-fg' : 'text-muted'}`}
              >🏙 City</button>
            </div>

            <div>
              <p className="mb-2 text-sm text-muted">Focus length</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {PRESETS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setDurationMin(m)}
                    className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                      durationMin === m ? 'bg-accent text-accent-fg' : 'border border-border text-muted hover:bg-surface2'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min="25"
                    max="180"
                    value={durationMin}
                    onChange={(e) => setDurationMin(Math.min(180, Math.round(Number(e.target.value)) || 0))}
                    onBlur={(e) => setDurationMin(clampMin(e.target.value))}
                    className={`w-16 rounded-full border px-3 py-1.5 text-center text-sm focus:outline-none ${
                      PRESETS.includes(durationMin) ? 'border-border bg-bg text-fg' : 'border-accent bg-accent/5 text-fg'
                    }`}
                    aria-label="Custom minutes"
                  />
                  <span className="text-sm text-faint">min</span>
                </div>
              </div>
            </div>
            <input
              className={input}
              placeholder="What will you focus on? (optional)"
              value={task}
              onChange={(e) => setTask(e.target.value)}
            />
            <label className="flex items-center justify-center gap-2 text-sm text-muted">
              <input type="checkbox" className="h-4 w-4 accent-accent" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
              Strict mode — leaving the tab kills it
            </label>
            <p className={`text-xs ${durationMin >= SPECIAL_MIN ? 'text-accent' : 'text-faint'}`}>
              {special.emoji} Focus {SPECIAL_MIN}+ min to {special.verb}
              {durationMin >= SPECIAL_MIN ? ' — unlocked!' : ''}
            </p>
            <Button onClick={start} className="px-8 py-3 text-base">{isCity ? 'Build & focus' : 'Plant & focus'}</Button>
          </div>
        )}

        {phase === 'running' && (
          <div className="flex w-full flex-col items-center gap-5 text-center">
            <FocusScene type={element} progress={progress} dead={false} seed={seed} world={mode} />
            <p className="font-display text-5xl font-semibold tabular-nums">{fmt(remaining)}</p>
            {task && <p className="text-sm text-muted">“{task}”</p>}
            <p className="text-xs text-faint">{strict ? '⚠ Strict: don’t leave this tab' : 'Stay focused'}</p>
            <Button variant="ghost" onClick={fail}>Give up</Button>
          </div>
        )}

        {phase === 'done' && (
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <FocusScene type={element} progress={1} dead={false} seed={seed} world={mode} />
            <p className="font-display text-2xl">{elementEmoji[element]} {isCity ? 'It’s built!' : 'It grew!'}</p>
            <p className="text-sm text-muted">{durationMin} minutes focused. Added to your {isCity ? 'city' : 'forest'} below.</p>
            <Button onClick={() => setPhase('idle')}>Focus again</Button>
          </div>
        )}

        {phase === 'failed' && (
          <div className="flex w-full flex-col items-center gap-4 text-center">
            <FocusScene type={element} progress={progress} dead seed={seed} world={mode} />
            <p className="font-display text-2xl text-danger">It withered.</p>
            <p className="text-sm text-muted">You left before the timer finished. No shame — try a shorter session.</p>
            <Button onClick={() => setPhase('idle')}>Try again</Button>
          </div>
        )}
      </Card>

      {/* collection: garden or city */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-xl">Your {view === 'city' ? 'city' : 'forest'}</h2>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-border p-0.5 text-xs">
            <button onClick={() => setView('garden')} className={`rounded px-2.5 py-1 ${view !== 'city' ? 'bg-surface2 text-fg' : 'text-muted'}`}>🌳 Forest</button>
            <button onClick={() => setView('city')} className={`rounded px-2.5 py-1 ${view === 'city' ? 'bg-surface2 text-fg' : 'text-muted'}`}>🏙 City</button>
          </div>
          {viewCount > 0 && <span className="text-xs text-faint">drag to orbit</span>}
        </div>
      </div>
      {viewCount === 0 ? (
        <p className="text-sm text-faint">
          Empty for now. Finish a {view === 'city' ? 'City' : 'Forest'} session to {view === 'city' ? 'build your first structure' : 'grow your first plant'}.
        </p>
      ) : (
        <Card className="overflow-hidden p-0">
          <CollectionScene items={stats.completed} world={view} />
        </Card>
      )}
    </>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-2">
      <p className="text-xs text-faint">{label}</p>
      <p className="font-display text-lg">{value}</p>
    </div>
  )
}
