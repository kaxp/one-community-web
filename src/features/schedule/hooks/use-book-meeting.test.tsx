import { describe, expect, it, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useBookMeeting } from './use-book-meeting';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { queueBookError } from '@/test/msw-fixtures/schedule-handlers';

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

describe('useBookMeeting', () => {
  it('books a slot and invalidates qk.meetings.slotsAll + qk.meetings.bookingsAll', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useBookMeeting(), { wrapper: makeWrapper(client) });
    result.current.mutate({
      scheduled_at: '2026-04-26T10:00:00+05:30',
      duration_minutes: 30,
      purpose: 'Quick chat',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('confirmed');

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.meetings.slotsAll);
    expect(calledKeys).toContainEqual(qk.meetings.bookingsAll);
  });

  it('on 409 conflict invalidates slots so the grid refreshes', async () => {
    signedIn();
    queueBookError({
      status: 409,
      code: 'conflict',
      message: 'Target is not available at this time',
      detail: { scheduled_at: '2026-04-26T10:00:00+05:30' },
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useBookMeeting(), { wrapper: makeWrapper(client) });
    result.current.mutate({
      scheduled_at: '2026-04-26T10:00:00+05:30',
      duration_minutes: 30,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('conflict');
    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.meetings.slotsAll);
  });
});
