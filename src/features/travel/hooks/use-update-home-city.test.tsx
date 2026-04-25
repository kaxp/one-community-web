import { describe, expect, it, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useUpdateHomeCity } from './use-update-home-city';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { queueHomeCityError } from '@/test/msw-fixtures/travel-handlers';

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
      home_city: null,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe('useUpdateHomeCity', () => {
  it('updates auth-store home_city + invalidates qk.auth.me on success', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useUpdateHomeCity(), { wrapper: makeWrapper(client) });
    result.current.mutate({ home_city: 'Bengaluru' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(useAuthStore.getState().user?.home_city).toBe('Bengaluru');

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.auth.me);
  });

  it('does not touch auth-store on validation error', async () => {
    signedIn();
    queueHomeCityError({
      status: 422,
      code: 'validation_error',
      message: 'home_city must be 1-200 chars',
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const before = useAuthStore.getState().user?.home_city ?? null;
    const { result } = renderHook(() => useUpdateHomeCity(), { wrapper: makeWrapper(client) });
    result.current.mutate({ home_city: 'X' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(useAuthStore.getState().user?.home_city ?? null).toBe(before);
  });
});
