import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useSlots } from './use-slots';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueSlotsError,
  setMswSlotsFixture,
  SEED_DATE_A,
} from '@/test/msw-fixtures/schedule-handlers';

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

describe('useSlots', () => {
  it('returns the seed slot list', async () => {
    signedIn();
    const { result } = renderHookWithProviders(() => useSlots({ fromDate: SEED_DATE_A, days: 7 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length ?? 0).toBeGreaterThan(0);
    // All slots are IST per backend convention.
    expect(result.current.data?.[0]?.start).toMatch(/\+05:30$/);
  });

  it('returns an empty array when the fixture is empty', async () => {
    signedIn();
    setMswSlotsFixture([]);
    const { result } = renderHookWithProviders(() => useSlots({ fromDate: SEED_DATE_A, days: 7 }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('surfaces 500 internal_error as ApiError', async () => {
    signedIn();
    queueSlotsError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useSlots({ fromDate: SEED_DATE_A, days: 7 }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
