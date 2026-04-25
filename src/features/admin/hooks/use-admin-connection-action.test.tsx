import { describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAdminConnectionAction } from './use-admin-connection-action';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { queueAdminActionError } from '@/test/msw-fixtures/admin-handlers';

function signInAsAdmin() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '22222222-2222-4000-8000-000000000003',
      phone: '+918087464723',
      role: 'admin',
      name: 'Kapil',
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

describe('useAdminConnectionAction', () => {
  it('approves a row and invalidates qk.admin.connections, qk.admin.summary, qk.connections.pending', async () => {
    signInAsAdmin();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    // Pre-seed cache for invalidation observation.
    client.setQueryData(qk.admin.connections.list('pending_admin'), {
      pages: [{ items: [], next_cursor: null }],
      pageParams: [null],
    });
    client.setQueryData(qk.admin.summary, { ok: true });
    client.setQueryData(qk.connections.pending(50), { items: [], next_cursor: null });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useAdminConnectionAction(), {
      wrapper: makeWrapper(client),
    });

    result.current.mutate({
      connection_id: '11111111-aaaa-4000-8000-000000000001',
      current_status: 'pending_admin',
      action: 'approve',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('pending_target');

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.admin.connections.all);
    expect(calledKeys).toContainEqual(qk.admin.summary);
    expect(calledKeys).toContainEqual(qk.connections.pendingAll);
  });

  it('optimistically removes the row from the cached list during the request', async () => {
    signInAsAdmin();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const queryKey = qk.admin.connections.list('pending_admin');
    client.setQueryData(queryKey, {
      pages: [
        {
          items: [
            { connection_id: '11111111-aaaa-4000-8000-000000000001', status: 'pending_admin' },
            { connection_id: '11111111-aaaa-4000-8000-000000000002', status: 'pending_admin' },
          ],
          next_cursor: null,
        },
      ],
      pageParams: [null],
    });

    const { result } = renderHook(() => useAdminConnectionAction(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({
      connection_id: '11111111-aaaa-4000-8000-000000000001',
      current_status: 'pending_admin',
      action: 'approve',
    });

    // After onMutate (synchronous-ish) the cached list should not contain the
    // row any more.
    await waitFor(() => {
      const cached = client.getQueryData<{
        pages: { items: { connection_id: string }[] }[];
      }>(queryKey);
      const ids = cached?.pages.flatMap((p) => p.items.map((r) => r.connection_id)) ?? [];
      expect(ids).not.toContain('11111111-aaaa-4000-8000-000000000001');
    });
  });

  it('rolls back the cache on error', async () => {
    signInAsAdmin();
    queueAdminActionError({ status: 409, code: 'conflict', message: 'already handled' });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const queryKey = qk.admin.connections.list('pending_admin');
    const seeded = {
      pages: [
        {
          items: [
            { connection_id: '11111111-aaaa-4000-8000-000000000001', status: 'pending_admin' },
            { connection_id: '11111111-aaaa-4000-8000-000000000002', status: 'pending_admin' },
          ],
          next_cursor: null,
        },
      ],
      pageParams: [null],
    };
    client.setQueryData(queryKey, seeded);

    const { result } = renderHook(() => useAdminConnectionAction(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({
      connection_id: '11111111-aaaa-4000-8000-000000000001',
      current_status: 'pending_admin',
      action: 'approve',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('conflict');
    const cached = client.getQueryData<{
      pages: { items: { connection_id: string }[] }[];
    }>(queryKey);
    const ids = cached?.pages.flatMap((p) => p.items.map((r) => r.connection_id)) ?? [];
    expect(ids).toContain('11111111-aaaa-4000-8000-000000000001');
  });
});
