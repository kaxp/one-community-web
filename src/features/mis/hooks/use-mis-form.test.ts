import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useMisForm } from './use-mis-form';
import { useAuthStore } from '@/auth/auth-store';
import { queueMisFormError, setMswMisAlreadySubmitted } from '@/test/msw-fixtures/mis-handlers';

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

describe('useMisForm', () => {
  it('resolves with the seed fixture when the period is fresh', async () => {
    signedInStartup();
    const { result } = renderHookWithProviders(() => useMisForm());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.period).toBe('2026-04');
    expect(result.current.data?.already_submitted).toBe(false);
    expect(result.current.data?.prefill?.revenue).toBe(2000000);
  });

  it('reports already_submitted with last_submission_at when set', async () => {
    signedInStartup();
    setMswMisAlreadySubmitted('2026-04-23T15:45:00.000Z');
    const { result } = renderHookWithProviders(() => useMisForm());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.already_submitted).toBe(true);
    expect(result.current.data?.last_submission_at).toBe('2026-04-23T15:45:00.000Z');
  });

  it('surfaces a 500 error as ApiError', async () => {
    signedInStartup();
    queueMisFormError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useMisForm());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
