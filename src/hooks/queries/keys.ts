export const queryKeys = {
  works: {
    all: ['works'] as const,
    mine: () => [...queryKeys.works.all, 'mine'] as const,
    favorites: () => [...queryKeys.works.all, 'favorites'] as const,
    detail: (id: string, secret?: string | null) =>
      [...queryKeys.works.all, 'detail', id, secret ?? ''] as const,
    feed: (scope: string) => [...queryKeys.works.all, 'feed', scope] as const,
  },
  profile: {
    all: ['profile'] as const,
    mine: () => [...queryKeys.profile.all, 'mine'] as const,
    author: (userId: string) => [...queryKeys.profile.all, 'author', userId] as const,
    authorWorks: (userId: string) =>
      [...queryKeys.profile.all, 'author', userId, 'works'] as const,
  },
  homepage: {
    all: ['homepage'] as const,
    tutorials: () => [...queryKeys.homepage.all, 'tutorials'] as const,
  },
}

