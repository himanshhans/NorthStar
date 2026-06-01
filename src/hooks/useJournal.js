import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

export function useJournalEntries() {
  const sb = useSupabase()
  return useQuery({
    queryKey: ['journal'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('journal_entries')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })
}

export function useAddJournalEntry() {
  const sb = useSupabase()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ content, mood }) => {
      // AI reflection
      let ai_response = ''
      const { data, error } = await sb.functions.invoke('journal-insight', { body: { content, mood } })
      if (error) {
        let msg = error.message
        try {
          const b = await error.context?.json()
          msg = [b?.error, b?.detail].filter(Boolean).join(' — ') || msg
        } catch { /* */ }
        throw new Error(msg)
      }
      if (data?.error) throw new Error(data.error)
      ai_response = data.reflection ?? ''

      const { data: row, error: insErr } = await sb
        .from('journal_entries')
        .insert({ content, mood: mood || null, ai_response })
        .select()
        .single()
      if (insErr) throw insErr
      return row
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['journal'] }),
  })
}
