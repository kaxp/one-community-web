// Stable React Query keys. CLAUDE.md §5.9 — never inline keys in components.
// Add a factory per feature namespace as features are built.

export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  onboarding: {
    profile: ['onboarding', 'profile'] as const,
    lpProfile: ['onboarding', 'lp-profile'] as const,
  },
  connections: {
    all: ['connections'] as const,
    listAll: ['connections', 'list'] as const,
    // Stable key for useInfiniteQuery — cursor flows via pageParam, not the key.
    // Kept parameter-tolerant (limit only) so different pagination sizes don't
    // collide. Pre-existing call sites in admin tests pass a number; preserved.
    list: (limit: number) => ['connections', 'list', { limit }] as const,
    pendingAll: ['connections', 'pending'] as const,
    pending: (limit: number) => ['connections', 'pending', { limit }] as const,
  },
  search: {
    query: (body: unknown) => ['search', 'query', body] as const,
  },
  profile: {
    all: ['profile'] as const,
    byId: (id: string) => ['profile', 'byId', id] as const,
  },
  interactions: {
    log: ['interactions', 'log'] as const,
  },
  pitch: {
    profile: ['pitch', 'profile'] as const,
    deckJob: (id: string) => ['pitch', 'deckJob', id] as const,
  },
  matchmaking: {
    suggestions: ['matchmaking', 'suggestions'] as const,
    pending: ['matchmaking', 'pending'] as const,
    job: (id: string) => ['matchmaking', 'job', id] as const,
  },
  admin: {
    summary: ['admin', 'summary'] as const,
    connections: {
      all: ['admin', 'connections'] as const,
      list: (status: string) => ['admin', 'connections', { status }] as const,
    },
    dlq: (offset: number) => ['admin', 'dlq', { offset }] as const,
  },
} as const;
