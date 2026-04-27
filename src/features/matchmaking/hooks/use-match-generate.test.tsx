import { describe, expect, it } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useMatchGenerate } from './use-match-generate';
import { useAuthStore } from '@/auth/auth-store';
import { queueMatchmakingGenerateError } from '@/test/msw-fixtures/admin-matchmaking-ops-handlers';

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

describe('useMatchGenerate', () => {
  it('returns a 202 ack with a job_id', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() => useMatchGenerate());
    const ack = await act(async () => result.current.mutateAsync({ week_of: '2026-04-28' }));
    expect(ack.status).toBe('queued');
    expect(ack.job_id).toMatch(/^.+/);
  });

  it('surfaces 5xx ApiError', async () => {
    signedInAsAdmin();
    queueMatchmakingGenerateError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useMatchGenerate());
    await act(async () => {
      try {
        await result.current.mutateAsync({ week_of: '2026-04-28' });
      } catch {
        // expected; mutateAsync rethrows on error
      }
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
