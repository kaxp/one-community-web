import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useMatchSuggestions } from './use-match-suggestions';
import { useAuthStore } from '@/auth/auth-store';
import {
  queueMatchmakingListError,
  setMswMatchmakingFixture,
} from '@/test/msw-fixtures/matchmaking-handlers';

function signedInAsLP() {
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

describe('useMatchSuggestions', () => {
  it('returns the seeded list of approved suggestions', async () => {
    signedInAsLP();
    const { result } = renderHookWithProviders(() => useMatchSuggestions());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.length ?? 0).toBe(3);
    expect(result.current.data?.[0]?.status).toBe('approved');
  });

  it('returns an empty list when fixture is empty', async () => {
    signedInAsLP();
    setMswMatchmakingFixture([]);
    const { result } = renderHookWithProviders(() => useMatchSuggestions());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([]);
  });

  it('surfaces 500 internal_error as ApiError', async () => {
    signedInAsLP();
    queueMatchmakingListError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useMatchSuggestions());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
