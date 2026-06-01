import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

// --- Goals ---

export function useGoals(filters = {}) {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['goals', filters],
    queryFn: async () => {
      let q = sb.from('goals').select('*').order('created_at', { ascending: false })
      if (filters.category) q = q.eq('category', filters.category)
      if (filters.status) q = q.eq('status', filters.status)
      const { data, error } = await q
      if (error) throw error
      return data
    },
  })
}

export function useGoal(id) {
  const sb = useSupabase()
  return useQuery({
    enabled: !!id,
    queryKey: ['goal', id],
    queryFn: async () => {
      const { data: goal, error } = await sb.from('goals').select('*').eq('id', id).single()
      if (error) throw error
      const { data: milestones, error: mErr } = await sb
        .from('milestones')
        .select('*')
        .eq('goal_id', id)
        .order('order_index', { ascending: true })
      if (mErr) throw mErr
      return { ...goal, milestones }
    },
  })
}

/**
 * Create a goal and its milestones in one shot.
 * `milestones` is the array returned/edited from the AI step.
 */
export function useCreateGoal() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goal, milestones }) => {
      const { data: created, error } = await sb
        .from('goals')
        .insert(goal)
        .select()
        .single()
      if (error) throw error

      if (milestones?.length) {
        const rows = milestones.map((m, i) => ({
          goal_id: created.id,
          title: m.title,
          description: m.description || null,
          due_date: m.due_date || null,
          order_index: i,
        }))
        const { error: mErr } = await sb.from('milestones').insert(rows)
        if (mErr) throw mErr
      }
      return created
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoalNotes() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, notes }) => {
      const { error } = await sb.from('goals').update({ notes }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['goal', v.id] }),
  })
}

export function useUpdateGoalStatus() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await sb.from('goals').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['goals'] })
      qc.invalidateQueries({ queryKey: ['goal', v.id] })
    },
  })
}

// --- Milestones ---

export function useToggleMilestone() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }) => {
      const { error } = await sb.from('milestones').update({ status }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['goal', v.goalId] }),
  })
}

/** Persist status + order_index for multiple milestones (Kanban drag). */
export function useUpdateMilestonesBulk() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goalId, updates }) => {
      await Promise.all(
        updates.map((u) =>
          sb.from('milestones').update({ status: u.status, order_index: u.order_index }).eq('id', u.id),
        ),
      )
    },
    onMutate: async ({ goalId, updates }) => {
      // optimistic: patch cached goal so the board doesn't snap back
      await qc.cancelQueries({ queryKey: ['goal', goalId] })
      const prev = qc.getQueryData(['goal', goalId])
      if (prev) {
        const byId = Object.fromEntries(updates.map((u) => [u.id, u]))
        qc.setQueryData(['goal', goalId], {
          ...prev,
          milestones: [...prev.milestones]
            .map((m) => (byId[m.id] ? { ...m, ...byId[m.id] } : m))
            .sort((a, b) => a.order_index - b.order_index),
        })
      }
      return { prev, goalId }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(['goal', ctx.goalId], ctx.prev)
    },
    onSettled: (_d, _e, v) => qc.invalidateQueries({ queryKey: ['goal', v.goalId] }),
  })
}

// --- Recovery / catch-up ---

const isoToday = () => new Date().toISOString().slice(0, 10)

/** A milestone is overdue if its due_date is past and it isn't done/skipped. */
export function isOverdue(m) {
  return m.due_date && m.due_date < isoToday() && m.status !== 'Completed' && m.status !== 'Skipped'
}

/** Push a milestone's due date forward by N days from today. */
export function useRescheduleMilestone() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, days = 7 }) => {
      const d = new Date()
      d.setDate(d.getDate() + days)
      const { error } = await sb
        .from('milestones')
        .update({ due_date: d.toISOString().slice(0, 10) })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['goal', v.goalId] }),
  })
}

/** Ask AI to break a missed milestone into smaller steps; insert them, skip the original. */
export function useReplanMilestone() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ goal, milestone, reason }) => {
      const { data, error } = await sb.functions.invoke('recovery-replan', {
        body: {
          goalTitle: goal.title,
          milestoneTitle: milestone.title,
          milestoneDescription: milestone.description,
          reason,
          targetDate: goal.target_date,
        },
      })
      if (error) {
        let msg = error.message
        try {
          const b = await error.context?.json()
          msg = [b?.error, b?.detail].filter(Boolean).join(' — ') || msg
        } catch { /* */ }
        throw new Error(msg)
      }
      if (data?.error) throw new Error(data.error)

      const steps = data.steps ?? []
      if (!steps.length) throw new Error('AI returned no steps')

      const baseOrder = (goal.milestones || []).reduce((mx, m) => Math.max(mx, m.order_index), 0)
      const rows = steps.map((s, i) => ({
        goal_id: goal.id,
        title: s.title,
        description: s.description || null,
        due_date: s.due_date || null,
        order_index: baseOrder + 1 + i,
      }))

      const { error: insErr } = await sb.from('milestones').insert(rows)
      if (insErr) throw insErr

      // Mark the missed milestone as Skipped (replaced by smaller steps).
      const { error: upErr } = await sb
        .from('milestones')
        .update({ status: 'Skipped' })
        .eq('id', milestone.id)
      if (upErr) throw upErr
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['goal', v.goal.id] }),
  })
}

// --- AI milestone generation via edge function ---

export function useGenerateMilestones() {
  const sb = useSupabase()
  return useMutation({
    mutationFn: async (goal) => {
      const { data, error } = await sb.functions.invoke('generate-milestones', {
        body: goal,
      })
      if (error) {
        // FunctionsHttpError hides the body in error.context (a Response). Dig it out.
        let msg = error.message
        try {
          const body = await error.context?.json()
          msg = [body?.error, body?.detail].filter(Boolean).join(' — ') || msg
        } catch { /* not JSON */ }
        throw new Error(msg)
      }
      if (data?.error) throw new Error(data.error)
      return data.milestones ?? []
    },
  })
}
