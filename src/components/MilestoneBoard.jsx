import { useState } from 'react'
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCorners, DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useUpdateMilestonesBulk } from '../hooks/useGoals'

const COLUMNS = [
  { id: 'Pending', label: 'To do' },
  { id: 'InProgress', label: 'In progress' },
  { id: 'Completed', label: 'Done' },
]

function groupByStatus(milestones) {
  const g = { Pending: [], InProgress: [], Completed: [] }
  for (const m of milestones) {
    if (m.status === 'Skipped') continue
    ;(g[m.status] ?? g.Pending).push(m)
  }
  for (const k of Object.keys(g)) g[k].sort((a, b) => a.order_index - b.order_index)
  return g
}

export default function MilestoneBoard({ goal }) {
  const update = useUpdateMilestonesBulk()
  const [cols, setCols] = useState(() => groupByStatus(goal.milestones || []))
  const [activeId, setActiveId] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const byId = Object.fromEntries((goal.milestones || []).map((m) => [m.id, m]))
  const findCol = (id) =>
    COLUMNS.map((c) => c.id).find((c) => cols[c].some((m) => m.id === id))

  function onDragOver({ active, over }) {
    if (!over) return
    const from = findCol(active.id)
    const to = cols[over.id] ? over.id : findCol(over.id)
    if (!from || !to || from === to) return
    setCols((prev) => {
      const item = prev[from].find((m) => m.id === active.id)
      return {
        ...prev,
        [from]: prev[from].filter((m) => m.id !== active.id),
        [to]: [...prev[to], { ...item, status: to }],
      }
    })
  }

  function onDragEnd({ active, over }) {
    setActiveId(null)
    if (over) {
      const from = findCol(active.id)
      const to = cols[over.id] ? over.id : findCol(over.id)
      if (from && to && from === to) {
        const arr = cols[from]
        const oldI = arr.findIndex((m) => m.id === active.id)
        const newI = arr.findIndex((m) => m.id === over.id)
        if (oldI !== newI && newI !== -1) {
          setCols((prev) => ({ ...prev, [from]: arrayMove(prev[from], oldI, newI) }))
        }
      }
    }
    // persist after state settles
    setTimeout(persist, 0)
  }

  function persist() {
    setCols((current) => {
      const updates = []
      let order = 0
      for (const col of COLUMNS) {
        for (const m of current[col.id]) {
          const orig = byId[m.id]
          if (!orig || orig.status !== col.id || orig.order_index !== order) {
            updates.push({ id: m.id, status: col.id, order_index: order })
          }
          order++
        }
      }
      if (updates.length) update.mutate({ goalId: goal.id, updates })
      return current
    })
  }

  const activeM = activeId ? byId[activeId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setActiveId(active.id)}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {COLUMNS.map((col) => (
          <Column key={col.id} col={col} items={cols[col.id]} />
        ))}
      </div>
      <DragOverlay>{activeM ? <CardBody m={activeM} dragging /> : null}</DragOverlay>
    </DndContext>
  )
}

function Column({ col, items }) {
  const { setNodeRef } = useSortable({ id: col.id, data: { container: true } })
  return (
    <div className="rounded-xl border border-border bg-bg p-2">
      <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-faint">
        {col.label} <span className="text-faint">· {items.length}</span>
      </p>
      <SortableContext items={items.map((m) => m.id)} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="min-h-16 space-y-2 p-1">
          {items.map((m) => <SortableCard key={m.id} m={m} />)}
        </div>
      </SortableContext>
    </div>
  )
}

function SortableCard({ m }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: m.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardBody m={m} />
    </div>
  )
}

function CardBody({ m, dragging }) {
  return (
    <div className={`cursor-grab rounded-lg border border-border bg-surface p-2.5 ${dragging ? 'shadow-xl' : ''}`}>
      <p className="text-sm font-medium">{m.title}</p>
      {m.due_date && <p className="mt-1 text-xs text-faint">due {m.due_date}</p>}
    </div>
  )
}
