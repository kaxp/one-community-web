import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useStartupProfile } from './use-startup-profile';
import { useAuthStore } from '@/auth/auth-store';
import { queuePitchProfileError, setMswProfileScenario } from '@/test/msw-fixtures/pitch-handlers';

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

describe('useStartupProfile', () => {
  it('resolves to status="present" with the seed fixture', async () => {
    signedInStartup();
    const { result } = renderHookWithProviders(() => useStartupProfile());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('present');
    if (result.current.data?.status === 'present') {
      expect(result.current.data.data.name).toMatch(/Acme/i);
    }
  });

  it('unwraps a 404 into status="missing" (no ApiError surfaced)', async () => {
    signedInStartup();
    setMswProfileScenario('missing');
    const { result } = renderHookWithProviders(() => useStartupProfile());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('missing');
    expect(result.current.isError).toBe(false);
  });

  it('still surfaces non-404 errors as ApiError', async () => {
    signedInStartup();
    queuePitchProfileError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useStartupProfile());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
