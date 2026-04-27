import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useMatchApprove } from './use-match-approve';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import {
  getMswMatchmakingApproveCount,
  queueMatchmakingOpsApproveError,
} from '@/test/msw-fixtures/admin-matchmaking-ops-handlers';
import type { MatchPendingResponse } from '@/features/matchmaking/schemas';

function signedInAsAdmin() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000002',
      phone: '+911234567890',
      role: 'admin',
      name: 'Admin',
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

function seedPendingRow(): MatchPendingResponse[number] {
  return {
    id: SEED_ID,
    lp_id: '00000000-0000-4000-8000-000000000004',
    startup_id: '3c9a1e00-1d12-4b56-9ab0-4d2c8b0f3a12',
    score: 0.91,
    reason: 'Sector + stage + ticket match',
    status: 'pending',
    week_of: '2026-04-28',
    company_name: 'Acme Technologies',
    sector: 'fintech',
    one_liner: 'AI for compliance',
  };
}

describe('useMatchApprove', () => {
  it('optimistically removes the row + invalidates pending+suggestions on success', async () => {
    signedInAsAdmin();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    client.setQueryData<MatchPendingResponse>(qk.matchmaking.pending, [seedPendingRow()]);

    const { result } = renderHook(() => useMatchApprove(), { wrapper: makeWrapper(client) });
    const startCount = getMswMatchmakingApproveCount();
    await act(async () => {
      result.current.mutate({ suggestion_id: SEED_ID });
    });

    await waitFor(() => {
      const cached = client.getQueryData<MatchPendingResponse>(qk.matchmaking.pending);
      expect(cached?.find((r) => r.id === SEED_ID)).toBeUndefined();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMswMatchmakingApproveCount()).toBe(startCount + 1);

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.matchmaking.pending);
    expect(calledKeys).toContainEqual(qk.matchmaking.suggestions);
  });

  it('rolls back the optimistic remove on error (RollbackContext path)', async () => {
    signedInAsAdmin();
    queueMatchmakingOpsApproveError({ status: 409, code: 'conflict', message: 'Already acted on' });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const seed = seedPendingRow();
    client.setQueryData<MatchPendingResponse>(qk.matchmaking.pending, [seed]);

    const { result } = renderHook(() => useMatchApprove(), { wrapper: makeWrapper(client) });
    await act(async () => {
      result.current.mutate({ suggestion_id: SEED_ID });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));

    const cached = client.getQueryData<MatchPendingResponse>(qk.matchmaking.pending);
    expect(cached?.find((r) => r.id === SEED_ID)).toEqual(seed);
    expect(result.current.error?.code).toBe('conflict');
  });
});
