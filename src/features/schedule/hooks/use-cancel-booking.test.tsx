import { describe, expect, it, vi } from 'vitest';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useCancelBooking } from './use-cancel-booking';
import { qk } from '@/api/query-keys';
import { useAuthStore } from '@/auth/auth-store';
import { queueCancelError } from '@/test/msw-fixtures/schedule-handlers';

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

const SEED_BOOKING_ID = 'e5f6a7b8-9c0d-4e2f-8a4b-5c6d7e8f9a01';

describe('useCancelBooking', () => {
  it('cancels a booking and invalidates bookings + slots on settle', async () => {
    signedIn();
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCancelBooking(), { wrapper: makeWrapper(client) });
    result.current.mutate({ booking_id: SEED_BOOKING_ID });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('cancelled');

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.meetings.bookingsAll);
    expect(calledKeys).toContainEqual(qk.meetings.slotsAll);
  });

  it('still invalidates bookings on a 403 forbidden error (reconcile from server)', async () => {
    signedIn();
    queueCancelError({
      status: 403,
      code: 'forbidden',
      message: 'You cannot cancel this booking',
    });
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidate = vi.spyOn(client, 'invalidateQueries');

    const { result } = renderHook(() => useCancelBooking(), { wrapper: makeWrapper(client) });
    result.current.mutate({ booking_id: SEED_BOOKING_ID });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('forbidden');

    const calledKeys = invalidate.mock.calls.map(
      (c) => (c[0] as { queryKey: readonly unknown[] } | undefined)?.queryKey,
    );
    expect(calledKeys).toContainEqual(qk.meetings.bookingsAll);
  });
});
