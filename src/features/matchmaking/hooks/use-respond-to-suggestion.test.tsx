import { describe, expect, it, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRespondToSuggestion } from './use-respond-to-suggestion';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueMatchmakingRespondError,
  setMswConnectionAlwaysCreates,
} from '@/test/msw-fixtures/matchmaking-handlers';
import type { MatchSuggestion } from '@/features/matchmaking/schemas';

function signedInAsLP() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role: 'lp',
      name: 'LP',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

const SEED_ID = 'c1d2e3f4-5a6b-4c8d-9e0f-1a2b3c4d5e6f';

const seedSuggestion: MatchSuggestion = {
  id: SEED_ID,
  lp_id: '00000000-0000-4000-8000-000000000004',
  startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
  score: 0.91,
  reason: 'Sector + stage + ticket match',
  status: 'approved',
  week_of: '2026-04-28',
  company_name: 'Acme Technologies',
  sector: 'fintech',
  one_liner: 'AI for compliance',
};

describe('useRespondToSuggestion', () => {
  it('optimistically removes the row and invalidates pending connections on connection_created', async () => {
    signedInAsLP();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(qk.matchmaking.suggestions, [seedSuggestion]);
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToSuggestion(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({ suggestion_id: SEED_ID, action: 'accepted' });

    await waitFor(() => {
      const data = client.getQueryData<MatchSuggestion[]>(qk.matchmaking.suggestions);
      expect(data?.find((s) => s.id === SEED_ID)).toBeUndefined();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.connection_created).toBe(true);

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.matchmaking.suggestions);
    expect(calledKeys).toContainEqual(qk.connections.pendingAll);
  });

  it('does not invalidate connections.pending when connection_created=false', async () => {
    signedInAsLP();
    setMswConnectionAlwaysCreates(false);
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(qk.matchmaking.suggestions, [seedSuggestion]);
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToSuggestion(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({ suggestion_id: SEED_ID, action: 'accepted' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.connection_created).toBe(false);

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.matchmaking.suggestions);
    expect(calledKeys).not.toContainEqual(qk.connections.pendingAll);
  });

  it('rolls back the optimistic remove on error', async () => {
    signedInAsLP();
    queueMatchmakingRespondError({
      status: 403,
      code: 'forbidden',
      message: 'Suggestion does not belong to caller',
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(qk.matchmaking.suggestions, [seedSuggestion]);

    const { result } = renderHook(() => useRespondToSuggestion(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({ suggestion_id: SEED_ID, action: 'accepted' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // Cache rolled back to its pre-mutate state, then onSettled invalidated it
    // (which refetches from MSW — the seed is still present on the server).
    await waitFor(() => {
      const data = client.getQueryData<MatchSuggestion[]>(qk.matchmaking.suggestions);
      expect(data?.some((s) => s.id === SEED_ID)).toBe(true);
    });
  });

  it('returns 409 conflict on a repeat respond (used to trigger silent refetch)', async () => {
    signedInAsLP();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useRespondToSuggestion(), {
      wrapper: makeWrapper(client),
    });

    // First respond succeeds.
    result.current.mutate({ suggestion_id: SEED_ID, action: 'rejected' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Second respond on the same id → 409 conflict.
    result.current.mutate({ suggestion_id: SEED_ID, action: 'accepted' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('conflict');
  });
});
