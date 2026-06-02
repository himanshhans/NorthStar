import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

const todayStr = () => new Date().toISOString().slice(0, 10)

export const ELEMENTS = ['pine', 'tree', 'bush', 'tulip', 'daisy']
export const randomElement = () => ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)]
export const elementEmoji = { pine: '🌲', tree: '🌳', bush: '🌿', tulip: '🌷', daisy: '🌼' }

export function useFocusSessions() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['focus_sessions'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('focus_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data
    },
  })
}

export function useSaveFocusSession() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (session) => {
      const { data, error } = await sb.from('focus_sessions').insert(session).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['focus_sessions'] }),
  })
}

/** Garden = completed sessions; plus quick stats. */
export function gardenStats(sessions = []) {
  const completed = sessions.filter((s) => s.completed)
  const todayMin = Math.round(
    completed
      .filter((s) => s.created_at?.slice(0, 10) === todayStr())
      .reduce((a, s) => a + (s.focused_sec || 0), 0) / 60,
  )
  const totalMin = Math.round(completed.reduce((a, s) => a + (s.focused_sec || 0), 0) / 60)
  return { completed, todayMin, totalMin, grown: completed.length }
}
