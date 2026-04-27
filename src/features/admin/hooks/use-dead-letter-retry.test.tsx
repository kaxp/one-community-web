import { describe, expect, it } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useDeadLetterRetry } from './use-dead-letter-retry';
import { useAuthStore } from '@/auth/auth-store';
import { getMswDlqRetryCount, queueDlqRetryError } from '@/test/msw-fixtures/admin-dlq-handlers';

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

describe('useDeadLetterRetry', () => {
  it('successfully retries a job and bumps the server-side counter', async () => {
    signedInAsAdmin();
    const startCount = getMswDlqRetryCount();
    const { result } = renderHookWithProviders(() => useDeadLetterRetry());
    await act(async () => {
      result.current.mutate({ id: 'dlq-00000001' });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(getMswDlqRetryCount()).toBe(startCount + 1);
    expect(result.current.data?.dlq_id).toBe('dlq-00000001');
  });

  it('surfaces ApiError on 5xx', async () => {
    signedInAsAdmin();
    queueDlqRetryError({ status: 500, code: 'internal_error', message: 'boom' });
    const { result } = renderHookWithProviders(() => useDeadLetterRetry());
    await act(async () => {
      result.current.mutate({ id: 'dlq-00000002' });
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
