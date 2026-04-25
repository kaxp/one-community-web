import { describe, expect, it } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useDeleteTravelPlan } from './use-delete-travel-plan';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { queueTravelDeleteError } from '@/test/msw-fixtures/travel-handlers';
import type { TravelPlansResponse } from '@/features/travel/schemas';

function signedIn() {
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

const SEED_ID = 'a1b2c3d4-0000-4000-8000-000000000001';

const seedPlan = {
  id: SEED_ID,
  user_id: '00000000-0000-4000-8000-000000000004',
  destination_city: 'Bengaluru',
  travel_start: '2026-05-10',
  travel_end: '2026-05-12',
  purpose: 'Investor meetings',
  status: 'active' as const,
  alerts_sent: false,
};

describe('useDeleteTravelPlan', () => {
  it('optimistically removes the row from cached plans on mutate', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const key = qk.travel.plans(true);
    client.setQueryData<TravelPlansResponse>(key, [seedPlan]);

    const { result } = renderHook(() => useDeleteTravelPlan(), { wrapper: makeWrapper(client) });
    result.current.mutate({ id: SEED_ID });

    // Optimistic remove (synchronous within onMutate).
    await waitFor(() => {
      const data = client.getQueryData<TravelPlansResponse>(key);
      expect(data?.find((p) => p.id === SEED_ID)).toBeUndefined();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('cancelled');
  });

  it('rolls back the optimistic remove on error', async () => {
    signedIn();
    queueTravelDeleteError({ status: 403, code: 'forbidden', message: 'Not your plan' });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const key = qk.travel.plans(true);
    client.setQueryData<TravelPlansResponse>(key, [seedPlan]);

    const { result } = renderHook(() => useDeleteTravelPlan(), { wrapper: makeWrapper(client) });
    result.current.mutate({ id: SEED_ID });

    await waitFor(() => expect(result.current.isError).toBe(true));
    // On settle, the cache is invalidated and refetched from MSW (which
    // still contains the seed plan, since the error was queued before any
    // server-side mutation could occur).
    await waitFor(() => {
      const data = client.getQueryData<TravelPlansResponse>(key);
      expect(data?.some((p) => p.id === SEED_ID)).toBe(true);
    });
  });
});
