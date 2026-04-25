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
    list: (limit: number, cursor?: string) => ['connections', 'list', { limit, cursor }] as const,
    pending: (limit: number, cursor?: string) =>
      ['connections', 'pending', { limit, cursor }] as const,
  },
  search: {
    query: (body: unknown) => ['search', 'query', body] as const,
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
    connections: (tab: string, cursor?: string) =>
      ['admin', 'connections', { tab, cursor }] as const,
    dlq: (offset: number) => ['admin', 'dlq', { offset }] as const,
  },
} as const;
