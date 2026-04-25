import { describe, expect, it, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRequestConnection } from './use-request-connection';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { queueRequestError } from '@/test/msw-fixtures/connections-handlers';

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
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return Wrapper;
}

const TARGET_ID = '11111111-1111-4000-8000-000000000003';

describe('useRequestConnection', () => {
  it('fires POST and invalidates qk.connections.pending + qk.profile.byId(target)', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useRequestConnection(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({ target_id: TARGET_ID, message: 'Hi there' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('pending_admin');

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.connections.pendingAll);
    expect(calledKeys).toContainEqual(qk.profile.byId(TARGET_ID));
  });

  it('surfaces 409 conflict via ApiError', async () => {
    signedIn();
    queueRequestError({ status: 409, code: 'conflict', message: 'already exists' });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useRequestConnection(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({ target_id: TARGET_ID });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('conflict');
  });
});
