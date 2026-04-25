import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useDeadLetterJobs } from './use-dead-letter-jobs';
import { useAuthStore } from '@/auth/auth-store';

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

describe('useDeadLetterJobs', () => {
  it('returns page 1 of 50 pending rows from the 60-row fixture', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() =>
      useDeadLetterJobs({ retry_status: 'pending', limit: 50, offset: 0 }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.length).toBe(50);
    expect(result.current.data?.limit).toBe(50);
    expect(result.current.data?.offset).toBe(0);
  });

  it('returns the trailing 10 rows on offset=50', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() =>
      useDeadLetterJobs({ retry_status: 'pending', limit: 50, offset: 50 }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.length).toBe(10);
    expect(result.current.data?.offset).toBe(50);
  });

  it('honours the retry_status filter', async () => {
    signedInAsAdmin();
    const { result } = renderHookWithProviders(() =>
      useDeadLetterJobs({ retry_status: 'retried', limit: 50, offset: 0 }),
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.items.every((r) => r.retry_status === 'retried')).toBe(true);
  });
});
