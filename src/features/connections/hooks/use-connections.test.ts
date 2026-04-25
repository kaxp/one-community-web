import { describe, expect, it } from 'vitest';
import { waitFor } from '@testing-library/react';
import { renderHookWithProviders } from '@/test/hook-utils';
import { useConnections } from './use-connections';
import { useAuthStore } from '@/auth/auth-store';
import { queueConnectionsListError } from '@/test/msw-fixtures/connections-handlers';

function signedIn() {
  useAuthStore.getState().setSession({
    token: 'msw-jwt.test',
    user: {
      id: '00000000-0000-4000-8000-000000000004',
      phone: '+911234567892',
      role: 'lp',
      name: 'LP',
      email: null,
      organisation: null,
      profile_complete: true,
    },
    expiresAt: Date.now() + 60 * 60_000,
  });
}

describe('useConnections', () => {
  it('fetches accepted rows from the seed fixture', async () => {
    signedIn();
    const { result } = renderHookWithProviders(() => useConnections());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const items = result.current.data?.pages[0]?.items ?? [];
    expect(items.length).toBeGreaterThanOrEqual(1);
    for (const row of items) expect(row.status).toBe('accepted');
  });

  it('surfaces 500 internal_error as ApiError', async () => {
    signedIn();
    queueConnectionsListError({ status: 500, code: 'internal_error', message: 'oops' });
    const { result } = renderHookWithProviders(() => useConnections());
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.code).toBe('internal_error');
  });
});
