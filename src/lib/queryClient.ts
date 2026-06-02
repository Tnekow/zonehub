import { QueryClient } from '@tanstack/react-query'
import { readQueryErrorMeta } from './typeGuards'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: (failureCount, error) => {
        const { status, code } = readQueryErrorMeta(error)
        if (status === 401 || status === 403 || code === 'unauthorized') return false
        return failureCount < 2
      },
    },
  },
})
