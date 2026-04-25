import { describe, expect, it, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRespondToConnection } from './use-respond-to-connection';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { queueRespondError } from '@/test/msw-fixtures/connections-handlers';

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

const PENDING_TARGET_INCOMING_ID = 'bb22cc33-dd44-4000-8000-001122334466';
const COUNTERPART_ID = '22222222-2222-4000-8000-000000000004';

describe('useRespondToConnection', () => {
  it('accepts a row, then invalidates qk.connections.list, qk.connections.pending and qk.profile.byId(counterpart)', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    client.setQueryData(qk.connections.pending(50), {
      pages: [{ items: [], next_cursor: null }],
      pageParams: [null],
    });
    client.setQueryData(qk.connections.list(50), {
      pages: [{ items: [], next_cursor: null }],
      pageParams: [null],
    });
    client.setQueryData(qk.profile.byId(COUNTERPART_ID), { ok: true });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToConnection(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({
      connection_id: PENDING_TARGET_INCOMING_ID,
      counterpart_id: COUNTERPART_ID,
      action: 'accept',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('accepted');

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.connections.pendingAll);
    expect(calledKeys).toContainEqual(qk.connections.listAll);
    expect(calledKeys).toContainEqual(qk.profile.byId(COUNTERPART_ID));
  });

  it('does NOT invalidate the accepted list or profile cache on decline', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useRespondToConnection(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({
      connection_id: PENDING_TARGET_INCOMING_ID,
      counterpart_id: COUNTERPART_ID,
      action: 'decline',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('declined');
    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.connections.pendingAll);
    expect(calledKeys).not.toContainEqual(qk.connections.listAll);
    expect(calledKeys).not.toContainEqual(qk.profile.byId(COUNTERPART_ID));
  });

  it('optimistically removes the row from the cached pending list during the request', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const queryKey = qk.connections.pending(50);
    client.setQueryData(queryKey, {
      pages: [
        {
          items: [
            { connection_id: PENDING_TARGET_INCOMING_ID, status: 'pending_target' },
            { connection_id: 'bb22cc33-dd44-4000-8000-001122334477', status: 'pending_target' },
          ],
          next_cursor: null,
        },
      ],
      pageParams: [null],
    });

    const { result } = renderHook(() => useRespondToConnection(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({
      connection_id: PENDING_TARGET_INCOMING_ID,
      counterpart_id: COUNTERPART_ID,
      action: 'accept',
    });

    await waitFor(() => {
      const cached = client.getQueryData<{
        pages: { items: { connection_id: string }[] }[];
      }>(queryKey);
      const ids = cached?.pages.flatMap((p) => p.items.map((r) => r.connection_id)) ?? [];
      expect(ids).not.toContain(PENDING_TARGET_INCOMING_ID);
    });
  });

  it('rolls back the cache on error', async () => {
    signedIn();
    queueRespondError({ status: 409, code: 'conflict', message: 'already handled' });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const queryKey = qk.connections.pending(50);
    client.setQueryData(queryKey, {
      pages: [
        {
          items: [{ connection_id: PENDING_TARGET_INCOMING_ID, status: 'pending_target' }],
          next_cursor: null,
        },
      ],
      pageParams: [null],
    });

    const { result } = renderHook(() => useRespondToConnection(), {
      wrapper: makeWrapper(client),
    });
    result.current.mutate({
      connection_id: PENDING_TARGET_INCOMING_ID,
      counterpart_id: COUNTERPART_ID,
      action: 'accept',
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('conflict');
    const cached = client.getQueryData<{
      pages: { items: { connection_id: string }[] }[];
    }>(queryKey);
    const ids = cached?.pages.flatMap((p) => p.items.map((r) => r.connection_id)) ?? [];
    expect(ids).toContain(PENDING_TARGET_INCOMING_ID);
  });
});
