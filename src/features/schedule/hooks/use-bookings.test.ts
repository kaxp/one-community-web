import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useBookings } from './use-bookings';
import { useAuthStore } from '@/auth/auth-store';
import { queueBookingsError } from '@/test/msw-fixtures/schedule-handlers';

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

describe('useBookings', () => {
  it('returns the seed bookings page', async () => {
    signedIn();
    const { result } = renderHookWithProviders(() => useBookings());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const items = result.current.data?.pages[0]?.items ?? [];
    expect(items.length).toBeGreaterThan(0);
    expect(items[0]?.scheduled_at).toMatch(/\+05:30$/);
  });

  it('surfaces 500 as ApiError', async () => {
    signedIn();
    queueBookingsError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useBookings());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
