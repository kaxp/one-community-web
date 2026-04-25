import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useMatchPending } from './use-match-pending';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueMatchmakingOpsPendingError,
  setMswMatchmakingPending,
} from '@/test/msw-fixtures/admin-matchmaking-ops-handlers';

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

describe('useMatchPending', () => {
  it('returns the seeded pending list', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useMatchPending());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect((result.current.data ?? []).length).toBeGreaterThan(0);
    expect(result.current.data?.[0]?.status).toBe('pending');
  });

  it('returns empty when fixture cleared', async () => {
    signedInAsAdmin();
    setMswMatchmakingPending([]);
    const { result } = renderHookWithProviders(() => useMatchPending());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('surfaces 500 internal_error', async () => {
    signedInAsAdmin();
    queueMatchmakingOpsPendingError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useMatchPending());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
