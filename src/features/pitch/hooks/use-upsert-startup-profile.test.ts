import { describe, expect, it } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useUpsertStartupProfile } from './use-upsert-startup-profile';
import { useAuthStore } from '@/auth/auth-store';
import { queuePitchProfileSaveError } from '@/test/msw-fixtures/pitch-handlers';

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

describe('useUpsertStartupProfile', () => {
  it('posts a profile and resolves with the saved row', async () => {
    signedInStartup();
    const { result } = renderHookWithProviders(() => useUpsertStartupProfile());
    await act(async () => {
      result.current.mutate({ name: 'New Co', stage: 'seed' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.name).toBe('New Co');
  });

  it('surfaces 422 validation_error as ApiError', async () => {
    signedInStartup();
    queuePitchProfileSaveError({
      status: 422,
      code: 'validation_error',
      message: 'name is required',
    });
    const { result } = renderHookWithProviders(() => useUpsertStartupProfile());
    await act(async () => {
      result.current.mutate({ name: 'X' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('validation_error');
  });
});
