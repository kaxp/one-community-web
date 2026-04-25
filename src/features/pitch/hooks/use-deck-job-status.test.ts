import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useDeckJobStatus } from './use-deck-job-status';
import { useAuthStore } from '@/auth/auth-store';
import { setMswDeckOutcome } from '@/test/msw-fixtures/pitch-handlers';
import { postDeck } from '@/api/endpoints';

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

describe('useDeckJobStatus', () => {
  it('reports STARTED while pollsBeforeReady is positive', async () => {
    signedInStartup();
    setMswDeckOutcome('success', { pollsBeforeReady: 5 });
    const ack = await postDeck({ deck_url: 'https://drive.google.com/file/d/abc/view' });
    const { result } = renderHookWithProviders(() => useDeckJobStatus(ack.job_id));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.state).toBe('STARTED');
    expect(result.current.data?.ready).toBe(false);
  });

  it('returns SUCCESS once pollsBeforeReady reaches 0', async () => {
    signedInStartup();
    // Zero polls until ready → first GET resolves SUCCESS immediately.
    setMswDeckOutcome('success', { pollsBeforeReady: 0 });
    const ack = await postDeck({ deck_url: 'https://drive.google.com/file/d/abc/view' });
    const { result } = renderHookWithProviders(() => useDeckJobStatus(ack.job_id));
    await waitFor(() => expect(result.current.data?.ready).toBe(true));
    expect(result.current.data?.state).toBe('SUCCESS');
    expect(result.current.data?.result?.signal).toBe('strong');
  });
});
