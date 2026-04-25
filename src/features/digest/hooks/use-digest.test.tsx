import { describe, expect, it, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useAdminDigest } from './use-admin-digest';
import { useDigestPending } from './use-digest-pending';
import { useDigestApprove } from './use-digest-approve';
import { useDigestSend } from './use-digest-send';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { renderHookWithProviders } from '@/test/hook-utils';
import {
  queueDigestApproveError,
  queueDigestSendError,
} from '@/test/msw-fixtures/admin-digest-handlers';

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

describe('digest hooks', () => {
  it('useAdminDigest returns the seeded workflow list', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useAdminDigest());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const names = result.current.data?.map((w) => w.workflow_name) ?? [];
    expect(names).toContain('lp_weekly');
    expect(names).toContain('vc_monthly');
  });

  it('useDigestPending lists pending drafts', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useDigestPending());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data ?? []).length).toBeGreaterThan(0);
  });

  it('useDigestApprove optimistically removes + invalidates pending/history/admin.summary', async () => {
    signedInAsAdmin();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const SEED_ID = 'e3d2c1b0-1234-4678-90ab-cdef01234567';
    client.setQueryData(qk.digest.pending, [
      {
        id: SEED_ID,
        user_id: 'b1c2d300-4e5f-4a7b-8c9d-0e1f2a3b4c5d',
        digest_type: 'lp_weekly',
        content: { status: 'pending', subject: 'Hi' },
        sent_at: null,
      },
    ]);

    const { result } = renderHook(() => useDigestApprove(), { wrapper: makeWrapper(client) });
    result.current.mutate({ digest_id: SEED_ID });

    await waitFor(() => {
      const cached = client.getQueryData<unknown[]>(qk.digest.pending);
      expect(cached).toEqual([]);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.digest.pending);
    expect(calledKeys).toContainEqual(qk.digest.historyAll);
    expect(calledKeys).toContainEqual(qk.admin.summary);
  });

  it('useDigestApprove rolls back on error', async () => {
    signedInAsAdmin();
    queueDigestApproveError({
      status: 409,
      code: 'conflict',
      message: 'Digest is not in pending state',
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const SEED_ID = 'e3d2c1b0-1234-4678-90ab-cdef01234567';
    const seed = [
      {
        id: SEED_ID,
        user_id: 'b1c2d300-4e5f-4a7b-8c9d-0e1f2a3b4c5d',
        digest_type: 'lp_weekly',
        content: { status: 'pending', subject: 'Hi' },
        sent_at: null,
      },
    ];
    client.setQueryData(qk.digest.pending, seed);

    const { result } = renderHook(() => useDigestApprove(), { wrapper: makeWrapper(client) });
    result.current.mutate({ digest_id: SEED_ID });
    await waitFor(() => expect(result.current.isError).toBe(true));
    // Cache rolled back, then onSettled invalidates from MSW (which still has the seed).
    await waitFor(() => {
      const cached = client.getQueryData<{ id: string }[]>(qk.digest.pending);
      expect(cached?.find((r) => r.id === SEED_ID)).toBeTruthy();
    });
  });

  it('useDigestSend invalidates admin.digest + history + summary on success', async () => {
    signedInAsAdmin();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useDigestSend(), { wrapper: makeWrapper(client) });
    result.current.mutate({ workflow_name: 'lp_weekly' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.admin.digest);
    expect(calledKeys).toContainEqual(qk.digest.historyAll);
    expect(calledKeys).toContainEqual(qk.admin.summary);
  });

  it('useDigestSend surfaces 409 conflict', async () => {
    signedInAsAdmin();
    queueDigestSendError({
      status: 409,
      code: 'conflict',
      message: 'A send is already in progress for this workflow',
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const { result } = renderHook(() => useDigestSend(), { wrapper: makeWrapper(client) });
    result.current.mutate({ workflow_name: 'lp_weekly' });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('conflict');
  });
});
