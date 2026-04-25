import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useMisPrefill } from './use-mis-prefill';
import { useAuthStore } from '@/auth/auth-store';
import { queueMisPrefillError, setMswMisPrefillFixture } from '@/test/msw-fixtures/mis-handlers';

function signedInStartup() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000005',
      phone: '+911234567894',
      role: 'startup_funded',
      name: 'Founder',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('useMisPrefill', () => {
  it('returns last-month prefill when present', async () => {
    signedInStartup();
    const { result } = renderHookWithProviders(() => useMisPrefill());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.period).toBe('2026-03');
    expect(result.current.data?.prefill?.revenue).toBe(2000000);
  });

  it('handles prefill=null (no prior submission)', async () => {
    signedInStartup();
    setMswMisPrefillFixture({ prefill: null });
    const { result } = renderHookWithProviders(() => useMisPrefill());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.prefill).toBeNull();
  });

  it('surfaces a 404 error as ApiError', async () => {
    signedInStartup();
    queueMisPrefillError({
      status: 404,
      code: 'not_found',
      message: 'No startup profile found',
    });
    const { result } = renderHookWithProviders(() => useMisPrefill());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('not_found');
  });
});
