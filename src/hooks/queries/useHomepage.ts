import { useQuery } from '@tanstack/react-query'
import { queryKeys } from './keys'
import { mockTutorials } from '../../data/mockHomepage'

export type TutorialItem = {
  id: number
  typeId: string
  source: 'flarum' | 'custom'
  flarumId: number | null
  title: string
  description: string | null
  url: string
  coverUrl: string | null
  sortOrder: number
}

export function useTutorials() {
  return useQuery({
    queryKey: queryKeys.homepage.tutorials(),
    queryFn: async () => mockTutorials as unknown as TutorialItem[],
    staleTime: 10 * 60_000,
  })
}
