import { QueryClient, MutationCache } from '@tanstack/react-query'
import { toast } from './toast'
import { humanizeError } from './errors'

const isPermanent = (error) => /\b401\b|\b403\b|\b404\b|unauthor|not found/i.test(String(error?.message || ''))

export const queryClient = new QueryClient({
  // every failed mutation (save goal, toggle habit, add event, AI calls…) surfaces a toast
  mutationCache: new MutationCache({
    onError: (error) => toast(humanizeError(error), 'error'),
  }),
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true, // re-fetch automatically when the connection returns
      retry: (count, error) => (isPermanent(error) ? false : count < 3),
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000), // 1s, 2s, 4s…
    },
    // mutations are NOT retried (avoid duplicate inserts); user retries manually
    mutations: { retry: 0 },
  },
})
