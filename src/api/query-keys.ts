// Stable React Query keys. CLAUDE.md §5.9 — never inline keys in components.
// Add a factory per feature namespace as features are built.

export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  onboarding: {
    profile: ['onboarding', 'profile'] as const,
    lpProfile: ['onboarding', 'lp-profile'] as const,
    cardScan: (scanId: string) => ['onboarding', 'card-scan', scanId] as const,
    cardScanAll: ['onboarding', 'card-scan'] as const,
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
    profileViewersAll: ['interactions', 'profile-viewers'] as const,
    profileViewers: (limit: number) => ['interactions', 'profile-viewers', { limit }] as const,
  },
  pitch: {
    profile: ['pitch', 'profile'] as const,
    deckJobAll: ['pitch', 'deckJob'] as const,
    deckJob: (id: string) => ['pitch', 'deckJob', id] as const,
  },
  mis: {
    all: ['mis'] as const,
    form: ['mis', 'form'] as const,
    prefill: ['mis', 'prefill'] as const,
  },
  meetings: {
    all: ['meetings'] as const,
    slots: (fromDate: string, days: number) => ['meetings', 'slots', { fromDate, days }] as const,
    slotsAll: ['meetings', 'slots'] as const,
    bookings: (limit: number) => ['meetings', 'bookings', { limit }] as const,
    bookingsAll: ['meetings', 'bookings'] as const,
  },
  travel: {
    all: ['travel'] as const,
    plansAll: ['travel', 'plans'] as const,
    plans: (activeOnly: boolean) => ['travel', 'plans', { active_only: activeOnly }] as const,
  },
  matchmaking: {
    suggestions: ['matchmaking', 'suggestions'] as const,
    pending: ['matchmaking', 'pending'] as const,
    jobAll: ['matchmaking', 'job'] as const,
    job: (id: string) => ['matchmaking', 'job', id] as const,
  },
  admin: {
    summary: ['admin', 'summary'] as const,
    digest: ['admin', 'digest'] as const,
    connections: {
      all: ['admin', 'connections'] as const,
      list: (status: string) => ['admin', 'connections', { status }] as const,
    },
    quarterlyReports: (quarter: string | null) =>
      ['admin', 'quarterly-reports', { quarter }] as const,
    quarterlyReportsAll: ['admin', 'quarterly-reports'] as const,
    dlq: (args: { retry_status: string; limit: number; offset: number }) =>
      ['admin', 'dlq', args] as const,
    dlqAll: ['admin', 'dlq'] as const,
    lpFunnel: (userId: string) => ['admin', 'lp-funnel', userId] as const,
  },
  digest: {
    pending: ['digest', 'pending'] as const,
    history: (limit: number) => ['digest', 'history', { limit }] as const,
    historyAll: ['digest', 'history'] as const,
  },
} as const;
