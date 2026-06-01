import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

const todayStr = () => new Date().toISOString().slice(0, 10)

/** Latest check-in of a given type for today (or null). */
export function useTodayCheckin(type) {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['checkin', type, todayStr()],
    queryFn: async () => {
      const { data, error } = await sb
        .from('checkins')
        .select('*')
        .eq('type', type)
        .eq('date', todayStr())
        .order('created_at', { ascending: false })
        .limit(1)
      if (error) throw error
      return data?.[0] ?? null
    },
  })
}

/** Generic check-in save (morning/midday) — no AI call. */
export function useSubmitCheckin(type) {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (content) => {
      const { data, error } = await sb
        .from('checkins')
        .insert({ type, content })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['checkin', type, todayStr()] }),
  })
}

/**
 * Submit an evening reflection: ask Gemini for feedback, then save the
 * check-in row with both the content and the AI response.
 */
export function useSubmitReflection() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ content, goals }) => {
      // 1. AI feedback
      let ai_response = ''
      const { data, error } = await sb.functions.invoke('reflection-feedback', {
        body: { ...content, goals },
      })
      if (error) {
        let msg = error.message
        try {
          const body = await error.context?.json()
          msg = [body?.error, body?.detail].filter(Boolean).join(' — ') || msg
        } catch { /* not JSON */ }
        throw new Error(msg)
      }
      if (data?.error) throw new Error(data.error)
      ai_response = data.feedback ?? ''

      // 2. Persist
      const { data: row, error: insErr } = await sb
        .from('checkins')
        .insert({ type: 'evening', content, ai_response })
        .select()
        .single()
      if (insErr) throw insErr
      return row
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['checkin', 'evening', todayStr()] }),
  })
}
