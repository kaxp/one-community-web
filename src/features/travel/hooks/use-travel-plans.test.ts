import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useTravelPlans } from './use-travel-plans';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueTravelListError,
  setMswTravelPlansFixture,
} from '@/test/msw-fixtures/travel-handlers';

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

describe('useTravelPlans', () => {
  it('returns active plans by default (filters past trips)', async () => {
    signedIn();
    const { result } = renderHookWithProviders(() => useTravelPlans({ activeOnly: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Seed has 3 plans; one has travel_end < today (2026-04-25) and is excluded.
    expect(result.current.data?.length).toBe(2);
    expect(result.current.data?.every((p) => p.travel_end >= '2026-04-25')).toBe(true);
  });

  it('includes past plans when activeOnly=false', async () => {
    signedIn();
    const { result } = renderHookWithProviders(() => useTravelPlans({ activeOnly: false }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length).toBe(3);
  });

  it('returns empty array when fixture is empty', async () => {
    signedIn();
    setMswTravelPlansFixture([]);
    const { result } = renderHookWithProviders(() => useTravelPlans({ activeOnly: true }));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('surfaces 500 internal_error as ApiError', async () => {
    signedIn();
    queueTravelListError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useTravelPlans({ activeOnly: true }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
