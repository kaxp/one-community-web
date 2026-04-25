import { describe, expect, it, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCreateTravelPlan } from './use-create-travel-plan';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { queueTravelCreateError } from '@/test/msw-fixtures/travel-handlers';

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

describe('useCreateTravelPlan', () => {
  it('creates a plan and invalidates plansAll', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCreateTravelPlan(), { wrapper: makeWrapper(client) });
    result.current.mutate({
      destination_city: 'Pune',
      travel_start: '2026-07-01',
      travel_end: '2026-07-03',
      purpose: 'Demo day',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.destination_city).toBe('Pune');
    expect(result.current.data?.status).toBe('active');

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.travel.plansAll);
  });

  it('surfaces a 422 validation error from the server', async () => {
    signedIn();
    queueTravelCreateError({
      status: 422,
      code: 'validation_error',
      message: 'Validation failed',
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useCreateTravelPlan(), { wrapper: makeWrapper(client) });
    result.current.mutate({
      destination_city: 'Goa',
      travel_start: '2026-08-01',
      travel_end: '2026-08-04',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('validation_error');
  });

  it('omits purpose from the wire body when undefined', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useCreateTravelPlan(), { wrapper: makeWrapper(client) });
    result.current.mutate({
      destination_city: 'Hyderabad',
      travel_start: '2026-09-01',
      travel_end: '2026-09-02',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.purpose).toBeNull();
  });
});
