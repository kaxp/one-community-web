import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useSubmitMis } from './use-submit-mis';
import { useAuthStore } from '@/auth/auth-store';
import { queueMisSubmitError, setMswMisAlreadySubmitted } from '@/test/msw-fixtures/mis-handlers';

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

describe('useSubmitMis', () => {
  it('submits successfully and returns the submission ack', async () => {
    signedInStartup();
    const { result } = renderHookWithProviders(() => useSubmitMis('2026-04'));
    result.current.mutate({
      revenue: 2100000,
      burn: 1600000,
      runway_months: 7,
      headcount: 14,
      highlights: 'Hired 2 engineers.',
      lowlights: 'Revenue dipped slightly.',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.period).toBe('2026-04');
    expect(result.current.data?.submission_id).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('surfaces 409 mis_already_submitted as ApiError', async () => {
    signedInStartup();
    setMswMisAlreadySubmitted('2026-04-01T00:00:00.000Z');
    const { result } = renderHookWithProviders(() => useSubmitMis('2026-04'));
    result.current.mutate({ revenue: 100, burn: 50 });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('mis_already_submitted');
    expect(result.current.error?.status).toBe(409);
  });

  it('surfaces 422 validation_error (e.g. extra raw_data key) as ApiError', async () => {
    signedInStartup();
    queueMisSubmitError({
      status: 422,
      code: 'validation_error',
      message: 'Validation failed',
      detail: [{ loc: ['body', 'raw_data', 'secret_field'], msg: 'extra fields not permitted' }],
    });
    const { result } = renderHookWithProviders(() => useSubmitMis('2026-04'));
    result.current.mutate({ revenue: 100 });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('validation_error');
  });
});
