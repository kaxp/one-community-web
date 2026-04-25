import { describe, expect, it } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useSubmitDeck } from './use-submit-deck';
import { useAuthStore } from '@/auth/auth-store';
import { queuePitchDeckError } from '@/test/msw-fixtures/pitch-handlers';

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

describe('useSubmitDeck', () => {
  it('returns an ack with a UUID job_id on 202', async () => {
    signedInStartup();
    const { result } = renderHookWithProviders(() => useSubmitDeck());
    await act(async () => {
      result.current.mutate({ deck_url: 'https://drive.google.com/file/d/abc/view' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.status).toBe('queued');
    expect(result.current.data?.job_id).toMatch(/^[0-9a-f-]+$/);
  });

  it('surfaces 404 (no profile) as ApiError', async () => {
    signedInStartup();
    queuePitchDeckError({ status: 404, code: 'not_found', message: 'create profile first' });
    const { result } = renderHookWithProviders(() => useSubmitDeck());
    await act(async () => {
      result.current.mutate({ deck_url: 'https://drive.google.com/file/d/abc/view' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('not_found');
  });
});
