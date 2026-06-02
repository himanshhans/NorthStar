import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSupabase } from '../lib/supabase'

const todayStr = () => new Date().toISOString().slice(0, 10)

// `sakura` / `landmark` are special — only awarded for 60+ min sessions, never in random pools.
export const SPECIAL_MIN = 60
export const SAKURA_MIN = SPECIAL_MIN // back-compat

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)]

// Garden biome (plants) + 60-min specials
export const ELEMENTS = ['pine', 'tree', 'maple', 'bush', 'tulip', 'daisy', 'rose', 'lavender']
export const GARDEN_SPECIALS = ['sakura', 'clover']
export const randomElement = () => rand(ELEMENTS)

// City biome (buildings) + 60-min iconic landmarks
export const BUILDINGS = ['house', 'shop', 'tower', 'skyscraper', 'hospital', 'school', 'powerplant', 'park', 'mall', 'watertreatment']
export const LANDMARKS = ['burj', 'eiffel', 'bigben', 'liberty', 'pyramid']
export const randomBuilding = () => rand(BUILDINGS)

// Pick the element to grow for a session, given biome + duration.
export function pickElement(mode, durationMin) {
  if (mode === 'city') return durationMin >= SPECIAL_MIN ? rand(LANDMARKS) : randomBuilding()
  return durationMin >= SPECIAL_MIN ? rand(GARDEN_SPECIALS) : randomElement()
}

export const elementEmoji = {
  pine: '🌲', tree: '🌳', maple: '🍁', bush: '🌿',
  tulip: '🌷', daisy: '🌼', rose: '🌹', lavender: '💜', sakura: '🌸', clover: '🍀',
  house: '🏠', shop: '🏪', tower: '🏢', skyscraper: '🏙️',
  hospital: '🏥', school: '🏫', powerplant: '🏭',
  park: '🏞️', mall: '🏬', watertreatment: '💧',
  burj: '🌆', eiffel: '🗼', bigben: '🕰️', liberty: '🗽', pyramid: '🔺',
}

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
